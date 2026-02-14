from __future__ import annotations

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
from app.db.models.supplier_confirmed_order import SupplierConfirmedOrder
from app.db.models.supplier_product import SupplierProduct
from app.service.email_service import send_group_confirmed_email
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
    if supplier_business_id:
        supplier = await session.get(Business, supplier_business_id)
        if not supplier:
            raise ValueError("Supplier business not found")
        if supplier.account_type != "supplier":
            raise ValueError("supplier_business_id must reference a supplier account")
        if supplier.region_id is not None and supplier.region_id != business.region_id:
            raise ValueError("Supplier must be in the same region as the buying group")
    if supplier_product_id:
        supplier_product = await session.get(SupplierProduct, supplier_product_id)
        if not supplier_product:
            raise ValueError("Supplier product not found")
        if supplier and supplier_product.supplier_business_id != supplier.id:
            raise ValueError("Supplier product does not belong to supplier_business_id")
        if supplier_product.status != "active":
            raise ValueError("Supplier product is not active")
        if supplier_product.available_units <= 0:
            raise ValueError("Supplier product is out of stock")
        if target_units and target_units > supplier_product.available_units:
            raise ValueError("target_units exceeds supplier available units")
        if not supplier:
            supplier = await session.get(Business, supplier_product.supplier_business_id)

    group = BuyingGroup(
        id=str(uuid4()),
        product_id=product_id,
        created_by_business_id=created_by_business_id,
        supplier_business_id=supplier.id if supplier else None,
        supplier_product_id=supplier_product.id if supplier_product else None,
        region_id=business.region_id,
        target_units=target_units or product.min_bulk_units,
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

    rollups = await _fetch_group_rollups(session, [group.id])
    current_units = int(rollups.get(group.id, {}).get("current_units", 0))
    max_units_allowed = int(group.target_units)
    if group.supplier_product_id:
        supplier_product = await session.get(SupplierProduct, group.supplier_product_id)
        if not supplier_product:
            raise ValueError("Supplier product not found")
        max_units_allowed = min(max_units_allowed, int(supplier_product.available_units))

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


async def _maybe_confirm_group(session: AsyncSession, group_id: str) -> None:
    group = await session.get(BuyingGroup, group_id)
    if not group or group.status == "confirmed":
        return

    rollups = await _fetch_group_rollups(session, [group_id])
    stats = rollups.get(group_id, {"current_units": 0, "business_count": 0})
    current_units = int(stats["current_units"])
    business_count = int(stats["business_count"])

    if business_count < int(group.min_businesses_required):
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
            session.add(
                SupplierConfirmedOrder(
                    id=str(uuid4()),
                    supplier_business_id=group.supplier_business_id,
                    supplier_product_id=group.supplier_product_id,
                    group_id=group.id,
                    total_units=current_units,
                    business_count=business_count,
                    status="confirmed",
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


def _group_base_query() -> Select[tuple[BuyingGroup, Product]]:
    return (
        select(BuyingGroup, Product)
        .join(Product, Product.id == BuyingGroup.product_id)
        .order_by(BuyingGroup.created_at.desc())
    )


async def list_active_groups(session: AsyncSession) -> list[dict[str, object]]:
    result = await session.execute(_group_base_query().where(BuyingGroup.status.in_(["active", "confirmed"])))
    rows = result.all()

    groups = [row[0] for row in rows]
    products_by_group = {row[0].id: row[1] for row in rows}
    rollups = await _fetch_group_rollups(session, [group.id for group in groups])

    payload: list[dict[str, object]] = []
    for group in groups:
        product = products_by_group[group.id]
        rollup = rollups.get(group.id, {"current_units": 0, "business_count": 0})
        metrics = _build_group_metrics(product, rollup["current_units"], rollup["business_count"], group.target_units)
        supplier_available_units = None
        if group.supplier_product_id:
            sp = await session.get(SupplierProduct, group.supplier_product_id)
            supplier_available_units = int(sp.available_units) if sp is not None else None

        max_capacity = int(group.target_units)
        if supplier_available_units is not None:
            max_capacity = min(max_capacity, supplier_available_units)
        remaining_units = max(0, max_capacity - int(rollup["current_units"]))

        payload.append(
            {
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

    return payload


async def get_group_details(session: AsyncSession, group_id: str) -> dict[str, object] | None:
    result = await session.execute(_group_base_query().where(BuyingGroup.id == group_id))
    row = result.first()
    if not row:
        return None

    group, product = row
    rollups = await _fetch_group_rollups(session, [group.id])
    metrics = _build_group_metrics(
        product,
        rollups.get(group.id, {}).get("current_units", 0),
        rollups.get(group.id, {}).get("business_count", 0),
        group.target_units,
    )

    commitments_result = await session.execute(
        select(GroupCommitment).where(GroupCommitment.group_id == group.id).order_by(GroupCommitment.created_at.asc())
    )
    commitments = commitments_result.scalars().all()
    supplier_available_units = None
    if group.supplier_product_id:
        sp = await session.get(SupplierProduct, group.supplier_product_id)
        supplier_available_units = int(sp.available_units) if sp is not None else None
    max_capacity = int(group.target_units)
    if supplier_available_units is not None:
        max_capacity = min(max_capacity, supplier_available_units)
    remaining_units = max(0, max_capacity - int(metrics["current_units"]))

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
                "units": commitment.units,
                "created_at": commitment.created_at,
            }
            for commitment in commitments
        ],
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
