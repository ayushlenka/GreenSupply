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
    target_units: int | None,
    deadline: datetime | None,
) -> BuyingGroup:
    product = await session.get(Product, product_id)
    if not product:
        raise ValueError("Product not found")

    business = await session.get(Business, created_by_business_id)
    if not business:
        raise ValueError("Business not found")

    group = BuyingGroup(
        id=str(uuid4()),
        product_id=product_id,
        created_by_business_id=created_by_business_id,
        target_units=target_units or product.min_bulk_units,
        deadline=deadline or (datetime.utcnow() + timedelta(hours=72)),
        status="active",
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
    return commitment


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
    result = await session.execute(_group_base_query().where(BuyingGroup.status == "active"))
    rows = result.all()

    groups = [row[0] for row in rows]
    products_by_group = {row[0].id: row[1] for row in rows}
    rollups = await _fetch_group_rollups(session, [group.id for group in groups])

    payload: list[dict[str, object]] = []
    for group in groups:
        product = products_by_group[group.id]
        rollup = rollups.get(group.id, {"current_units": 0, "business_count": 0})
        metrics = _build_group_metrics(product, rollup["current_units"], rollup["business_count"], group.target_units)

        payload.append(
            {
                "id": group.id,
                "status": group.status,
                "deadline": group.deadline,
                "target_units": group.target_units,
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

    return {
        "id": group.id,
        "status": group.status,
        "deadline": group.deadline,
        "target_units": group.target_units,
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
