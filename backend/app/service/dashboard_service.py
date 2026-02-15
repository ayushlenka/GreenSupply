from __future__ import annotations

import statistics
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.buying_group import BuyingGroup
from app.db.models.group_commitment import GroupCommitment
from app.db.models.product import Product


async def get_business_dashboard_summary(
    session: AsyncSession, business_id: str
) -> dict[str, float | int]:
    """Compute the 8 individual-business dashboard metrics."""

    # Fetch all commitments for this business, joined with group + product
    stmt = (
        select(GroupCommitment, BuyingGroup, Product)
        .join(BuyingGroup, BuyingGroup.id == GroupCommitment.group_id)
        .join(Product, Product.id == BuyingGroup.product_id)
        .where(GroupCommitment.business_id == business_id)
    )
    result = await session.execute(stmt)
    rows = result.all()

    if not rows:
        return {
            "your_total_savings_usd": 0.0,
            "your_weighted_savings_pct": 0.0,
            "your_groups_joined": 0,
            "your_group_conversion_rate": 0.0,
            "your_median_time_to_confirmation_hours": None,
            "your_units_committed": 0,
            "your_co2_saved_kg": 0.0,
            "your_plastic_avoided_kg": 0.0,
        }

    total_savings = Decimal(0)
    total_retail_cost = Decimal(0)
    total_units = 0
    total_co2 = Decimal(0)
    total_plastic = Decimal(0)
    confirmed_count = 0
    confirmation_hours: list[float] = []

    for commitment, group, product in rows:
        units = int(commitment.units or 0)
        total_units += units

        retail_cost = Decimal(units) * product.retail_unit_price
        bulk_cost = Decimal(units) * product.bulk_unit_price
        savings = retail_cost - bulk_cost
        total_savings += savings
        total_retail_cost += retail_cost

        total_co2 += Decimal(units) * product.co2_per_unit_kg
        total_plastic += Decimal(units) * product.plastic_avoided_per_unit_kg

        if group.status in ("confirmed", "completed"):
            confirmed_count += 1
            if group.confirmed_at and commitment.created_at:
                delta = group.confirmed_at - commitment.created_at
                hours = delta.total_seconds() / 3600
                if hours >= 0:
                    confirmation_hours.append(round(hours, 2))

    groups_joined = len(rows)
    conversion_rate = round((confirmed_count / groups_joined) * 100, 2) if groups_joined > 0 else 0.0
    weighted_savings_pct = (
        round(float(total_savings / total_retail_cost) * 100, 2) if total_retail_cost > 0 else 0.0
    )
    median_hours = round(statistics.median(confirmation_hours), 2) if confirmation_hours else None

    return {
        "your_total_savings_usd": round(float(total_savings), 2),
        "your_weighted_savings_pct": weighted_savings_pct,
        "your_groups_joined": groups_joined,
        "your_group_conversion_rate": conversion_rate,
        "your_median_time_to_confirmation_hours": median_hours,
        "your_units_committed": total_units,
        "your_co2_saved_kg": round(float(total_co2), 4),
        "your_plastic_avoided_kg": round(float(total_plastic), 4),
    }
