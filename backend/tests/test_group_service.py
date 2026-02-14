from decimal import Decimal
from types import SimpleNamespace
import unittest

from app.service.group_service import _build_group_metrics, join_group


class TestGroupService(unittest.IsolatedAsyncioTestCase):
    async def test_build_group_metrics(self):
        product = SimpleNamespace(
            retail_unit_price=Decimal("0.32"),
            bulk_unit_price=Decimal("0.24"),
            co2_per_unit_kg=Decimal("0.021"),
            plastic_avoided_per_unit_kg=Decimal("0.012"),
            min_bulk_units=5000,
        )

        metrics = _build_group_metrics(product, current_units=1000, business_count=4, target_units=5000)

        self.assertEqual(metrics["current_units"], 1000)
        self.assertEqual(metrics["business_count"], 4)
        self.assertEqual(metrics["progress_pct"], 20.0)
        self.assertEqual(metrics["estimated_savings_usd"], 80.0)
        self.assertEqual(metrics["estimated_savings_pct"], 25.0)
        self.assertEqual(metrics["estimated_co2_saved_kg"], 21.0)
        self.assertEqual(metrics["estimated_plastic_avoided_kg"], 12.0)
        self.assertEqual(metrics["delivery_trips_reduced"], 3)
        self.assertEqual(metrics["delivery_miles_saved"], 12.0)

    async def test_join_group_rejects_non_positive_units(self):
        with self.assertRaises(ValueError) as ctx:
            await join_group(session=None, group_id="g1", business_id="b1", units=0)

        self.assertEqual(str(ctx.exception), "units must be greater than 0")
