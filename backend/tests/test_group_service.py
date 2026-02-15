from decimal import Decimal
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from app.service.group_service import (
    _build_group_metrics,
    _maybe_confirm_group,
    _remaining_units_for_group,
    create_group,
    join_group,
    supplier_approve_group,
)


class _ExecResult:
    def __init__(self, *, one=None, rows=None):
        self._one = one
        self._rows = rows or []

    def scalar_one_or_none(self):
        return self._one

    def all(self):
        return self._rows

    def first(self):
        if not self._rows:
            return None
        return self._rows[0]

    def scalars(self):
        return _ScalarRows(self._rows)


class _ScalarRows:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return list(self._rows)


class _Session:
    def __init__(self, gets=None, executes=None):
        self._gets = gets or {}
        self._executes = executes or []
        self.added = []
        self.commit_count = 0

    async def get(self, model, key):
        return self._gets.get((model.__name__, key))

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        self.commit_count += 1

    async def refresh(self, _obj):
        return None

    async def execute(self, _stmt):
        if self._executes:
            return self._executes.pop(0)
        return _ExecResult()


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

    async def test_create_group_rejects_target_above_supplier_inventory(self):
        product = SimpleNamespace(id="p1", min_bulk_units=100)
        business = SimpleNamespace(id="b1", account_type="business", region_id=2)
        supplier = SimpleNamespace(id="s1", account_type="supplier", region_id=2)
        supplier_product = SimpleNamespace(
            id="sp1",
            supplier_business_id="s1",
            status="active",
            available_units=50,
        )
        session = _Session(
            gets={
                ("Product", "p1"): product,
                ("Business", "b1"): business,
                ("Business", "s1"): supplier,
                ("SupplierProduct", "sp1"): supplier_product,
            }
        )

        with self.assertRaises(ValueError) as ctx:
            await create_group(
                session,
                product_id="p1",
                created_by_business_id="b1",
                supplier_business_id="s1",
                supplier_product_id="sp1",
                target_units=60,
                min_businesses_required=5,
                deadline=None,
            )

        self.assertIn("exceeds supplier available units", str(ctx.exception))

    async def test_auto_confirm_decrements_supplier_inventory(self):
        group = SimpleNamespace(
            id="g1",
            status="active",
            target_units=200,
            min_businesses_required=2,
            supplier_business_id="s1",
            supplier_product_id="sp1",
            confirmed_at=None,
        )
        supplier_product = SimpleNamespace(id="sp1", available_units=150, status="active")

        session = _Session(
            gets={
                ("BuyingGroup", "g1"): group,
                ("SupplierProduct", "sp1"): supplier_product,
            },
            executes=[
                _ExecResult(one=None),
                _ExecResult(rows=[("a@x.com",), ("b@x.com",)]),
            ],
        )

        with patch("app.service.group_service._fetch_group_rollups", new=AsyncMock(return_value={"g1": {"current_units": 120, "business_count": 2}})), \
             patch("app.service.group_service.send_group_confirmed_email", new=AsyncMock(return_value=True)):
            await _maybe_confirm_group(session, "g1")

        self.assertEqual(group.status, "confirmed")
        self.assertEqual(supplier_product.available_units, 30)
        self.assertEqual(supplier_product.status, "active")
        self.assertEqual(len(session.added), 1)

    async def test_auto_confirm_fails_when_inventory_insufficient(self):
        group = SimpleNamespace(
            id="g2",
            status="active",
            target_units=200,
            min_businesses_required=2,
            supplier_business_id="s1",
            supplier_product_id="sp2",
            confirmed_at=None,
        )
        supplier_product = SimpleNamespace(id="sp2", available_units=40, status="active")
        session = _Session(
            gets={
                ("BuyingGroup", "g2"): group,
                ("SupplierProduct", "sp2"): supplier_product,
            },
            executes=[],
        )

        with patch("app.service.group_service._fetch_group_rollups", new=AsyncMock(return_value={"g2": {"current_units": 80, "business_count": 2}})):
            with self.assertRaises(ValueError) as ctx:
                await _maybe_confirm_group(session, "g2")

        self.assertIn("insufficient", str(ctx.exception))
        self.assertEqual(group.status, "active")
        self.assertEqual(supplier_product.available_units, 40)

    async def test_join_group_rejects_units_above_remaining_capacity(self):
        group = SimpleNamespace(
            id="g3",
            status="active",
            target_units=100,
            supplier_product_id="sp3",
            region_id=2,
        )
        business = SimpleNamespace(id="b1", account_type="business", region_id=2)
        supplier_product = SimpleNamespace(id="sp3", available_units=95)
        session = _Session(
            gets={
                ("BuyingGroup", "g3"): group,
                ("Business", "b1"): business,
                ("SupplierProduct", "sp3"): supplier_product,
            }
        )

        with patch(
            "app.service.group_service._fetch_group_rollups",
            new=AsyncMock(return_value={"g3": {"current_units": 90, "business_count": 2}}),
        ):
            with self.assertRaises(ValueError) as ctx:
                await join_group(session, group_id="g3", business_id="b1", units=6)

        self.assertIn("remaining group capacity", str(ctx.exception))

    async def test_join_group_rejects_completed_group(self):
        group = SimpleNamespace(
            id="g4",
            status="completed",
            target_units=100,
            supplier_product_id=None,
            region_id=2,
        )
        business = SimpleNamespace(id="b1", account_type="business", region_id=2)
        session = _Session(
            gets={
                ("BuyingGroup", "g4"): group,
                ("Business", "b1"): business,
            }
        )

        with self.assertRaises(ValueError) as ctx:
            await join_group(session, group_id="g4", business_id="b1", units=10)

        self.assertEqual(str(ctx.exception), "Group is no longer open for joining")

    async def test_supplier_approve_group_rejects_completed_group(self):
        group = SimpleNamespace(
            id="g5",
            status="completed",
            supplier_business_id="s1",
        )
        session = _Session(gets={("BuyingGroup", "g5"): group})

        with self.assertRaises(ValueError) as ctx:
            await supplier_approve_group(session, group_id="g5", supplier_business_id="s1")

        self.assertEqual(str(ctx.exception), "Group is no longer eligible for supplier approval")

    async def test_maybe_confirm_skips_completed_group(self):
        group = SimpleNamespace(
            id="g6",
            status="completed",
            target_units=100,
            min_businesses_required=1,
            supplier_business_id=None,
            supplier_product_id=None,
            confirmed_at=None,
        )
        session = _Session(gets={("BuyingGroup", "g6"): group})

        with patch("app.service.group_service._fetch_group_rollups", new=AsyncMock(return_value={"g6": {"current_units": 100, "business_count": 2}})):
            await _maybe_confirm_group(session, "g6")

        self.assertEqual(group.status, "completed")
        self.assertEqual(session.commit_count, 0)

    async def test_remaining_units_for_group_terminal_statuses(self):
        self.assertEqual(
            _remaining_units_for_group(status="confirmed", current_units=200, max_capacity=500),
            0,
        )
        self.assertEqual(
            _remaining_units_for_group(status="completed", current_units=200, max_capacity=500),
            0,
        )
        self.assertEqual(
            _remaining_units_for_group(status="capacity_reached", current_units=200, max_capacity=500),
            0,
        )

    async def test_remaining_units_for_group_active_status(self):
        self.assertEqual(
            _remaining_units_for_group(status="active", current_units=200, max_capacity=500),
            300,
        )
