from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.models.business import Business
from app.db.models.buying_group import BuyingGroup
from app.db.models.group_commitment import GroupCommitment
from app.db.models.product import Product
from app.db.models.region import Region
from app.db.models.supplier_confirmed_order import SupplierConfirmedOrder
from app.db.models.supplier_product import SupplierProduct
from app.service.delivery_route_service import compute_delivery_route, next_business_day_start_utc
from app.service.email_service import send_group_confirmed_email
from app.service.supplier_service import get_reserved_units_by_supplier_product
from app.service.utils import safe_divide, to_float

settings = get_settings()


def _build_group_metrics(
    product: Product, current_units: int, business_count: int, target_units: int
) -> dict[str, float | int]:
    retail_cost = Decimal(current_units) * product.retail_unit_price
    bulk_cost = Decimal(current_units) * product.bulk_unit_price
    savings = retail_cost - bulk_cost

    plastic_avoided = Decimal(current_units) * product.plastic_avoided_per_unit_kg
    co2_reduced = Decimal(current_units) * product.co2_per_unit_kg

    baseline_deliveries = business_count
    consolidated_deliveries = 1 if business_count > 0 else 0

    miles_saved = max(
        0.0,
        (settings.baseline_delivery_miles * baseline_deliveries) - settings.consolidated_delivery_miles,
    )

    return {
        "current_units": current_units,
        "business_count": business_count,
        "progress_pct": round(safe_divide(current_units, max(target_units, 1)) * 100, 2),
        "estimated_savings_usd": round(to_float(savings), 2),
        "estimated_savings_pct": round(safe_divide(to_float(savings), to_float(retail_cost)) * 100, 2),
        "estimated_co2_saved_kg": round(to_float(co2_reduced), 4),
        "estimated_plastic_avoided_kg": round(to_float(plastic_avoided), 4),
        "delivery_trips_reduced": max(0, baseline_deliveries - consolidated_deliveries),
        "delivery_miles_saved": round(miles_saved, 2),
    }


async def create_group(
    session: AsyncSession,
    *,
    product_id: str,
    created_by_business_id: str,
    supplier_business_id: str | None,
    supplier_product_id: str | None,
    target_units: int | None,
    min_businesses_required: int | None,
    deadline: datetime | None,
) -> BuyingGroup:
    product = await session.get(Product, product_id)
    if not product:
        raise ValueError("Product not found")

    business = await session.get(Business, created_by_business_id)
    if not business:
        raise ValueError("Business not found")
    if business.account_type != "business":
        raise ValueError("Only business accounts can create buying groups")
    if business.region_id is None:
        raise ValueError("Business must be assigned to a region before creating a group")

    supplier = None
    supplier_product = None
    effective_available_units = None
    if supplier_business_id:
        supplier = await session.get(Business, supplier_business_id)
        if not supplier:
            raise ValueError("Supplier business not found")
        if supplier.account_type != "supplier":
            raise ValueError("supplier_business_id must reference a supplier account")
    if supplier_product_id:
        supplier_product = await session.get(SupplierProduct, supplier_product_id)
        if not supplier_product:
            raise ValueError("Supplier product not found")
        if supplier and supplier_product.supplier_business_id != supplier.id:
            raise ValueError("Supplier product does not belong to supplier_business_id")
        if supplier_product.status != "active":
            raise ValueError("Supplier product is not active")
        reserved_by_product = await get_reserved_units_by_supplier_product(session, [supplier_product.id])
        effective_available_units = max(
            0,
            int(supplier_product.available_units) - int(reserved_by_product.get(supplier_product.id, 0)),
        )
        if effective_available_units <= 0:
            raise ValueError("Supplier product is out of stock")
        if target_units and target_units > effective_available_units:
            raise ValueError("target_units exceeds supplier available units")
        if not supplier:
            supplier = await session.get(Business, supplier_product.supplier_business_id)

    final_target_units = target_units or product.min_bulk_units
    if supplier_product:
        if effective_available_units is None:
            effective_available_units = int(supplier_product.available_units)
        final_target_units = min(int(final_target_units), effective_available_units)
        if final_target_units <= 0:
            raise ValueError("Supplier product is out of stock")

    group = BuyingGroup(
        id=str(uuid4()),
        product_id=product_id,
        created_by_business_id=created_by_business_id,
        supplier_business_id=supplier.id if supplier else None,
        supplier_product_id=supplier_product.id if supplier_product else None,
        region_id=business.region_id,
        target_units=final_target_units,
        min_businesses_required=max(1, min_businesses_required or settings.group_default_min_businesses_required),
        deadline=deadline or (datetime.utcnow() + timedelta(hours=72)),
        status="active",
        confirmed_at=None,
        created_at=datetime.utcnow(),
    )
    session.add(group)
    await session.commit()
    await session.refresh(group)
    return group


async def join_group(session: AsyncSession, *, group_id: str, business_id: str, units: int) -> GroupCommitment:
    if units <= 0:
        raise ValueError("units must be greater than 0")

    group = await session.get(BuyingGroup, group_id)
    if not group:
        raise ValueError("Group not found")

    business = await session.get(Business, business_id)
    if not business:
        raise ValueError("Business not found")
    if business.account_type != "business":
        raise ValueError("Only business accounts can join groups")
    if business.region_id is None:
        raise ValueError("Business must be assigned to a region before joining groups")
    if group.region_id != business.region_id:
        raise ValueError("Businesses can only join groups in the same region")
    if group.status == "confirmed":
        raise ValueError("Group is already confirmed")
    existing_commitment = await session.execute(
        select(GroupCommitment.id).where(
            GroupCommitment.group_id == group.id,
            GroupCommitment.business_id == business.id,
        )
    )
    if existing_commitment.first() is not None:
        raise ValueError("Business has already joined this group")

    rollups = await _fetch_group_rollups(session, [group.id])
    current_units = int(rollups.get(group.id, {}).get("current_units", 0))
    business_count = int(rollups.get(group.id, {}).get("business_count", 0))
    max_units_allowed, _, status_changed = await _sync_group_capacity_status(
        session,
        group,
        current_units=current_units,
        business_count=business_count,
    )
    if status_changed:
        await session.commit()
    if group.status == "capacity_reached" and current_units >= max_units_allowed:
        raise ValueError("Group inventory capacity is filled; waiting on supplier restock")

    if current_units + units > max_units_allowed:
        remaining = max(0, max_units_allowed - current_units)
        raise ValueError(f"Requested units exceed remaining group capacity ({remaining} units left)")

    commitment = GroupCommitment(
        id=str(uuid4()),
        group_id=group_id,
        business_id=business_id,
        units=units,
        created_at=datetime.utcnow(),
    )
    session.add(commitment)
    await session.commit()
    await session.refresh(commitment)
    await _maybe_confirm_group(session, group.id)
    return commitment


async def supplier_approve_group(session: AsyncSession, *, group_id: str, supplier_business_id: str) -> None:
    group = await session.get(BuyingGroup, group_id)
    if not group:
        raise ValueError("Group not found")
    if group.supplier_business_id is None:
        raise ValueError("Group has no assigned supplier")
    if group.supplier_business_id != supplier_business_id:
        raise ValueError("Only the assigned supplier can approve this group")
    if group.status == "confirmed":
        raise ValueError("Group is already confirmed")

    await _maybe_confirm_group(session, group_id, allow_supplier_override=True)

    refreshed = await session.get(BuyingGroup, group_id)
    if refreshed is None or refreshed.status != "confirmed":
        raise ValueError("Group is not eligible for supplier approval yet")


async def _maybe_confirm_group(
    session: AsyncSession,
    group_id: str,
    *,
    allow_supplier_override: bool = False,
) -> None:
    group = await session.get(BuyingGroup, group_id)
    if not group or group.status == "confirmed":
        return

    rollups = await _fetch_group_rollups(session, [group_id])
    stats = rollups.get(group_id, {"current_units": 0, "business_count": 0})
    current_units = int(stats["current_units"])
    business_count = int(stats["business_count"])
    _, _, status_changed = await _sync_group_capacity_status(
        session,
        group,
        current_units=current_units,
        business_count=business_count,
    )
    if status_changed:
        await session.commit()
        await session.refresh(group)

    if current_units <= 0:
        if allow_supplier_override:
            raise ValueError("Cannot confirm a group with no committed units")
        return

    if business_count < int(group.min_businesses_required) and not allow_supplier_override:
        return

    supplier_product = None
    if group.supplier_product_id:
        supplier_product = await session.get(SupplierProduct, group.supplier_product_id)
        if supplier_product and supplier_product.available_units < current_units:
            raise ValueError("Supplier inventory is insufficient for confirmation")

    group.status = "confirmed"
    group.confirmed_at = datetime.utcnow()

    if group.supplier_business_id:
        existing = await session.execute(select(SupplierConfirmedOrder).where(SupplierConfirmedOrder.group_id == group.id))
        if existing.scalar_one_or_none() is None:
            if supplier_product:
                supplier_product.available_units = int(supplier_product.available_units) - current_units
                if supplier_product.available_units <= 0:
                    supplier_product.available_units = 0
                    supplier_product.status = "sold_out"

            supplier = await session.get(Business, group.supplier_business_id)
            route_points: list[list[float]] | None = None
            route_total_miles: float | None = None
            route_total_minutes: float | None = None
            if supplier is not None and supplier.latitude is not None and supplier.longitude is not None:
                commitment_businesses_result = await session.execute(
                    select(Business)
                    .join(GroupCommitment, GroupCommitment.business_id == Business.id)
                    .where(GroupCommitment.group_id == group.id)
                )
                commitment_businesses = commitment_businesses_result.scalars().all()
                delivery_stops = [
                    (float(b.latitude), float(b.longitude))
                    for b in commitment_businesses
                    if b.latitude is not None and b.longitude is not None
                ]
            else:
                delivery_stops = []

            if delivery_stops:
                route_points, route_total_miles, route_total_minutes = compute_delivery_route(
                    supplier_latitude=float(supplier.latitude),
                    supplier_longitude=float(supplier.longitude),
                    destination_points=delivery_stops,
                )

            scheduled_start_at = next_business_day_start_utc()
            estimated_end_at = (
                scheduled_start_at + timedelta(minutes=route_total_minutes)
                if route_total_minutes is not None
                else None
            )
            session.add(
                SupplierConfirmedOrder(
                    id=str(uuid4()),
                    supplier_business_id=group.supplier_business_id,
                    supplier_product_id=group.supplier_product_id,
                    group_id=group.id,
                    total_units=current_units,
                    business_count=business_count,
                    status="confirmed",
                    scheduled_start_at=scheduled_start_at,
                    estimated_end_at=estimated_end_at,
                    route_total_miles=route_total_miles,
                    route_total_minutes=route_total_minutes,
                    route_points=route_points,
                    created_at=datetime.utcnow(),
                )
            )

    await session.commit()

    participant_result = await session.execute(
        select(Business.email)
        .join(GroupCommitment, GroupCommitment.business_id == Business.id)
        .where(GroupCommitment.group_id == group.id, Business.email.is_not(None))
    )
    recipients = sorted({str(email).strip() for (email,) in participant_result.all() if email})
    await send_group_confirmed_email(recipients, group.id)


async def _fetch_group_rollups(session: AsyncSession, group_ids: list[str]) -> dict[str, dict[str, int]]:
    if not group_ids:
        return {}

    stmt = (
        select(
            GroupCommitment.group_id,
            func.coalesce(func.sum(GroupCommitment.units), 0).label("current_units"),
            func.count(func.distinct(GroupCommitment.business_id)).label("business_count"),
        )
        .where(GroupCommitment.group_id.in_(group_ids))
        .group_by(GroupCommitment.group_id)
    )
    result = await session.execute(stmt)

    rollups: dict[str, dict[str, int]] = {}
    for group_id, current_units, business_count in result.all():
        rollups[group_id] = {
            "current_units": int(current_units or 0),
            "business_count": int(business_count or 0),
        }
    return rollups


async def _compute_group_capacity(
    session: AsyncSession,
    group: BuyingGroup,
    *,
    exclude_group_reservations: bool = True,
) -> tuple[int, int | None]:
    max_capacity = int(group.target_units)
    supplier_available_units: int | None = None
    if group.supplier_product_id:
        sp = await session.get(SupplierProduct, group.supplier_product_id)
        if sp is None:
            raise ValueError("Supplier product not found")
        reserved_by_product = await get_reserved_units_by_supplier_product(
            session,
            [group.supplier_product_id],
            exclude_group_id=group.id if exclude_group_reservations else None,
        )
        supplier_available_units = max(
            0,
            int(sp.available_units) - int(reserved_by_product.get(group.supplier_product_id, 0)),
        )
        max_capacity = min(max_capacity, supplier_available_units)
    return max_capacity, supplier_available_units


async def _sync_group_capacity_status(
    session: AsyncSession,
    group: BuyingGroup,
    *,
    current_units: int,
    business_count: int,
) -> tuple[int, int | None, bool]:
    max_capacity, supplier_available_units = await _compute_group_capacity(session, group)
    changed = False
    if group.status != "confirmed":
        if current_units >= max_capacity and business_count < int(group.min_businesses_required):
            if group.status != "capacity_reached":
                group.status = "capacity_reached"
                changed = True
        elif group.status == "capacity_reached" and current_units < max_capacity:
            group.status = "active"
            changed = True
    return max_capacity, supplier_available_units, changed


def _group_base_query() -> Select:
    return (
        select(BuyingGroup, Product, Region)
        .join(Product, Product.id == BuyingGroup.product_id)
        .outerjoin(Region, Region.id == BuyingGroup.region_id)
        .order_by(BuyingGroup.created_at.desc())
    )


async def list_active_groups(session: AsyncSession, region_id: int | None = None) -> list[dict[str, object]]:
    stmt = _group_base_query().where(BuyingGroup.status.in_(["active", "capacity_reached", "confirmed"]))
    if region_id is not None:
        stmt = stmt.where(BuyingGroup.region_id == region_id)
    result = await session.execute(stmt)
    rows = result.all()

    groups = [row[0] for row in rows]
    products_by_group = {row[0].id: row[1] for row in rows}
    regions_by_group = {row[0].id: row[2] for row in rows}

    group_ids = [g.id for g in groups]
    sp_ids = sorted({g.supplier_product_id for g in groups if g.supplier_product_id})

    if sp_ids:
        rollups, reserved_by_product = await asyncio.gather(
            _fetch_group_rollups(session, group_ids),
            get_reserved_units_by_supplier_product(session, sp_ids),
        )
    else:
        rollups = await _fetch_group_rollups(session, group_ids)
        reserved_by_product = {}

    sp_objects: dict[str, SupplierProduct] = {}
    if sp_ids:
        sp_result = await session.execute(select(SupplierProduct).where(SupplierProduct.id.in_(sp_ids)))
        sp_objects = {sp.id: sp for sp in sp_result.scalars().all()}

    payload: list[dict[str, object]] = []
    has_status_updates = False
    for group in groups:
        product = products_by_group[group.id]
        rollup = rollups.get(group.id, {"current_units": 0, "business_count": 0})
        current_units = int(rollup["current_units"])
        business_count = int(rollup["business_count"])
        metrics = _build_group_metrics(product, current_units, business_count, group.target_units)

        max_capacity = int(group.target_units)
        supplier_available_units: int | None = None
        if group.supplier_product_id:
            sp = sp_objects.get(group.supplier_product_id)
            if sp:
                reserved = int(reserved_by_product.get(group.supplier_product_id, 0))
                supplier_available_units = max(0, int(sp.available_units) - reserved)
                max_capacity = min(max_capacity, supplier_available_units)

        changed = False
        if group.status != "confirmed":
            if current_units >= max_capacity and business_count < int(group.min_businesses_required):
                if group.status != "capacity_reached":
                    group.status = "capacity_reached"
                    changed = True
            elif group.status == "capacity_reached" and current_units < max_capacity:
                group.status = "active"
                changed = True
        if changed:
            has_status_updates = True
        remaining_units = max(0, max_capacity - current_units)
        region = regions_by_group.get(group.id)
        center_lat = round((region.min_lat + region.max_lat) / 2, 6) if region else None
        center_lng = round((region.min_lng + region.max_lng) / 2, 6) if region else None

        payload.append(
            {
                "id": group.id,
                "status": group.status,
                "created_by_business_id": group.created_by_business_id,
                "region_id": group.region_id,
                "group_center_latitude": center_lat,
                "group_center_longitude": center_lng,
                "supplier_business_id": group.supplier_business_id,
                "supplier_product_id": group.supplier_product_id,
                "supplier_available_units": supplier_available_units,
                "min_businesses_required": group.min_businesses_required,
                "confirmed_at": group.confirmed_at,
                "deadline": group.deadline,
                "target_units": group.target_units,
                "remaining_units": remaining_units,
                "product": {
                    "id": product.id,
                    "name": product.name,
                    "category": product.category,
                    "retail_unit_price": to_float(product.retail_unit_price),
                    "bulk_unit_price": to_float(product.bulk_unit_price),
                    "min_bulk_units": product.min_bulk_units,
                },
                **metrics,
            }
        )

    if has_status_updates:
        await session.commit()

    return payload


async def get_group_details(session: AsyncSession, group_id: str) -> dict[str, object] | None:
    result = await session.execute(_group_base_query().where(BuyingGroup.id == group_id))
    row = result.first()
    if not row:
        return None

    group, product, _region = row
    rollups = await _fetch_group_rollups(session, [group.id])
    current_units = int(rollups.get(group.id, {}).get("current_units", 0))
    business_count = int(rollups.get(group.id, {}).get("business_count", 0))
    max_capacity, supplier_available_units, status_changed = await _sync_group_capacity_status(
        session,
        group,
        current_units=current_units,
        business_count=business_count,
    )
    if status_changed:
        await session.commit()
        await session.refresh(group)
    metrics = _build_group_metrics(product, current_units, business_count, group.target_units)

    commitments_result = await session.execute(
        select(GroupCommitment, Business)
        .join(Business, Business.id == GroupCommitment.business_id)
        .where(GroupCommitment.group_id == group.id)
        .order_by(GroupCommitment.created_at.asc())
    )
    commitments = commitments_result.all()
    remaining_units = max(0, max_capacity - int(metrics["current_units"]))

    confirmed_order_result = await session.execute(
        select(SupplierConfirmedOrder).where(SupplierConfirmedOrder.group_id == group.id)
    )
    confirmed_order = confirmed_order_result.scalar_one_or_none()

    return {
        "id": group.id,
        "status": group.status,
        "region_id": group.region_id,
        "supplier_business_id": group.supplier_business_id,
        "supplier_product_id": group.supplier_product_id,
        "supplier_available_units": supplier_available_units,
        "min_businesses_required": group.min_businesses_required,
        "confirmed_at": group.confirmed_at,
        "deadline": group.deadline,
        "target_units": group.target_units,
        "remaining_units": remaining_units,
        "created_by_business_id": group.created_by_business_id,
        "product": {
            "id": product.id,
            "name": product.name,
            "category": product.category,
            "material": product.material,
            "certifications": product.certifications,
            "retail_unit_price": to_float(product.retail_unit_price),
            "bulk_unit_price": to_float(product.bulk_unit_price),
            "min_bulk_units": product.min_bulk_units,
        },
        "commitments": [
            {
                "id": commitment.id,
                "business_id": commitment.business_id,
                "business_name": business.name,
                "business_address": business.address,
                "latitude": business.latitude,
                "longitude": business.longitude,
                "units": commitment.units,
                "created_at": commitment.created_at,
            }
            for commitment, business in commitments
        ],
        "confirmed_order": (
            {
                "id": confirmed_order.id,
                "status": confirmed_order.status,
                "scheduled_start_at": confirmed_order.scheduled_start_at,
                "estimated_end_at": confirmed_order.estimated_end_at,
                "route_total_miles": confirmed_order.route_total_miles,
                "route_total_minutes": confirmed_order.route_total_minutes,
                "route_points": confirmed_order.route_points,
            }
            if confirmed_order is not None
            else None
        ),
        **metrics,
    }


async def get_group_impact(session: AsyncSession, group_id: str) -> dict[str, object] | None:
    group_details = await get_group_details(session, group_id)
    if not group_details:
        return None

    co2_saved = float(group_details["estimated_co2_saved_kg"])
    plastic_avoided = float(group_details["estimated_plastic_avoided_kg"])
    trips_reduced = int(group_details["delivery_trips_reduced"])
    miles_saved = float(group_details["delivery_miles_saved"])

    city_businesses = settings.city_projection_businesses
    business_count = max(1, int(group_details["business_count"]))
    scale_factor = city_businesses / business_count

    return {
        "group_id": group_id,
        "current_units": int(group_details["current_units"]),
        "estimated_savings_usd": float(group_details["estimated_savings_usd"]),
        "estimated_co2_saved_kg": co2_saved,
        "estimated_plastic_avoided_kg": plastic_avoided,
        "delivery_miles_saved": miles_saved,
        "delivery_trips_reduced": trips_reduced,
        "city_scale_projection": {
            "businesses": city_businesses,
            "yearly_co2_saved_kg": round(co2_saved * scale_factor * 12, 2),
            "yearly_plastic_avoided_kg": round(plastic_avoided * scale_factor * 12, 2),
            "yearly_delivery_miles_saved": round(miles_saved * scale_factor * 12, 2),
        },
    }
