import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from app.service.recommendation_service import (
    build_dashboard_recommendation,
    build_group_opportunities_recommendation,
    build_group_recommendation,
)


class TestRecommendationService(unittest.IsolatedAsyncioTestCase):
    async def test_returns_fallback_when_gemini_unavailable(self):
        group_details = {
            "id": "g1",
            "current_units": 1200,
            "target_units": 5000,
            "product": {
                "name": "9x9 Bagasse Clamshell",
                "category": "clamshell",
                "material": "bagasse",
                "certifications": ["BPI"],
            },
        }
        impact = {
            "estimated_savings_usd": 120.0,
            "estimated_co2_saved_kg": 25.2,
            "estimated_plastic_avoided_kg": 14.4,
            "delivery_trips_reduced": 2,
            "delivery_miles_saved": 10.0,
        }

        with patch("app.service.recommendation_service.get_group_details", new=AsyncMock(return_value=group_details)), \
             patch("app.service.recommendation_service.get_group_impact", new=AsyncMock(return_value=impact)), \
             patch("app.service.recommendation_service._call_gemini", new=AsyncMock(return_value=None)):
            result = await build_group_recommendation(session=object(), group_id="g1")

        self.assertEqual(result["source"], "fallback")
        self.assertEqual(result["group_id"], "g1")
        self.assertIn("recommended_packaging", result)

    async def test_returns_gemini_when_available(self):
        group_details = {
            "id": "g1",
            "current_units": 1200,
            "target_units": 5000,
            "product": {
                "name": "9x9 Bagasse Clamshell",
                "category": "clamshell",
                "material": "bagasse",
                "certifications": ["BPI"],
            },
        }
        impact = {
            "estimated_savings_usd": 120.0,
            "estimated_co2_saved_kg": 25.2,
            "estimated_plastic_avoided_kg": 14.4,
            "delivery_trips_reduced": 2,
            "delivery_miles_saved": 10.0,
        }
        gemini = {
            "recommended_packaging": "Use bagasse clamshells.",
            "tradeoffs": "Slightly higher storage sensitivity.",
            "sustainability_report": "Strong emissions and plastic reduction.",
        }

        with patch("app.service.recommendation_service.get_group_details", new=AsyncMock(return_value=group_details)), \
             patch("app.service.recommendation_service.get_group_impact", new=AsyncMock(return_value=impact)), \
             patch("app.service.recommendation_service._call_gemini", new=AsyncMock(return_value=gemini)):
            result = await build_group_recommendation(session=object(), group_id="g1")

        self.assertEqual(result["source"], "gemini")
        self.assertEqual(result["recommended_packaging"], gemini["recommended_packaging"])

    async def test_missing_group_raises_value_error(self):
        with patch("app.service.recommendation_service.get_group_details", new=AsyncMock(return_value=None)):
            with self.assertRaises(ValueError) as ctx:
                await build_group_recommendation(session=object(), group_id="missing")

        self.assertEqual(str(ctx.exception), "Group not found")

    async def test_dashboard_recommendation_fallback(self):
        groups = [
            {
                "business_count": 2,
                "estimated_savings_usd": 100.0,
                "estimated_co2_saved_kg": 20.0,
                "estimated_plastic_avoided_kg": 10.0,
                "delivery_trips_reduced": 1,
                "delivery_miles_saved": 5.0,
            }
        ]

        with patch("app.service.recommendation_service.list_active_groups", new=AsyncMock(return_value=groups), create=True), \
             patch("app.service.recommendation_service._call_gemini", new=AsyncMock(return_value=None)):
            result = await build_dashboard_recommendation(session=object(), business_name="Mission Cafe")

        self.assertEqual(result["source"], "fallback")
        self.assertIn("executive_summary", result)

    async def test_dashboard_recommendation_gemini(self):
        groups = [
            {
                "business_count": 3,
                "estimated_savings_usd": 200.0,
                "estimated_co2_saved_kg": 30.0,
                "estimated_plastic_avoided_kg": 12.0,
                "delivery_trips_reduced": 2,
                "delivery_miles_saved": 7.0,
            }
        ]
        gemini = {
            "executive_summary": "Summary",
            "key_insight": "Insight",
            "action_plan": "Plan",
            "city_scale_projection": "Projection",
        }

        with patch("app.service.recommendation_service.list_active_groups", new=AsyncMock(return_value=groups), create=True), \
             patch("app.service.recommendation_service._call_gemini", new=AsyncMock(return_value=gemini)):
            result = await build_dashboard_recommendation(session=object())

        self.assertEqual(result["source"], "gemini")
        self.assertEqual(result["key_insight"], "Insight")

    async def test_group_opportunities_fallback(self):
        business = SimpleNamespace(
            id="b1",
            account_type="business",
            business_type="cafe",
            region_id=2,
            name="Mission Cafe",
        )
        supplier_product = SimpleNamespace(
            id="sp1",
            supplier_business_id="s1",
            name="Takeout Paper Bag",
            category="bag",
            material="kraft paper",
            available_units=2000,
            unit_price=0.12,
        )
        region_groups = [
            {"product": {"category": "bag"}, "current_units": 900, "supplier_product_id": None},
        ]

        session = AsyncMock()
        session.get = AsyncMock(return_value=business)
        session.execute = AsyncMock()
        session.execute.side_effect = [
            SimpleNamespace(all=lambda: []),  # history rows: (units, status, supplier_product_id, category)
            SimpleNamespace(all=lambda: [("s1", "Supplier One")]),  # supplier names
        ]

        with patch("app.service.recommendation_service.list_supplier_products", new=AsyncMock(return_value=[supplier_product])), \
             patch("app.service.recommendation_service.get_reserved_units_by_supplier_product", new=AsyncMock(return_value={"sp1": 100})), \
             patch("app.service.recommendation_service.list_active_groups", new=AsyncMock(return_value=region_groups)), \
             patch("app.service.recommendation_service._call_gemini_object", new=AsyncMock(return_value=None)):
            result = await build_group_opportunities_recommendation(session, business_id="b1", max_results=3)

        self.assertEqual(result["source"], "fallback")
        self.assertEqual(result["region_id"], 2)
        self.assertGreaterEqual(len(result["opportunities"]), 1)
        self.assertEqual(result["opportunities"][0]["supplier_product_id"], "sp1")

    async def test_group_opportunities_gemini(self):
        business = SimpleNamespace(
            id="b1",
            account_type="business",
            business_type="cafe",
            region_id=2,
            name="Mission Cafe",
        )
        supplier_product = SimpleNamespace(
            id="sp1",
            supplier_business_id="s1",
            name="Takeout Paper Bag",
            category="bag",
            material="kraft paper",
            available_units=2000,
            unit_price=0.12,
        )

        session = AsyncMock()
        session.get = AsyncMock(return_value=business)
        session.execute = AsyncMock()
        session.execute.side_effect = [
            SimpleNamespace(all=lambda: []),  # history rows: (units, status, supplier_product_id, category)
            SimpleNamespace(all=lambda: [("s1", "Supplier One")]),  # supplier names
        ]

        gemini_payload = {
            "opportunities": [
                {
                    "supplier_business_id": "s1",
                    "supplier_business_name": "Supplier One",
                    "supplier_product_id": "sp1",
                    "product_name": "Takeout Paper Bag",
                    "category": "bag",
                    "material": "kraft paper",
                    "recommended_target_units": 1500,
                    "recommended_min_businesses_required": 3,
                    "recommended_deadline_days": 7,
                    "recommended_initial_commitment_units": 500,
                    "outreach_copy": "Copy",
                    "reasoning": "Reason",
                    "evidence_used": "Evidence",
                    "risk_note": "Risk",
                }
            ]
        }

        with patch("app.service.recommendation_service.list_supplier_products", new=AsyncMock(return_value=[supplier_product])), \
             patch("app.service.recommendation_service.get_reserved_units_by_supplier_product", new=AsyncMock(return_value={"sp1": 100})), \
             patch("app.service.recommendation_service.list_active_groups", new=AsyncMock(return_value=[])), \
             patch("app.service.recommendation_service._call_gemini_object", new=AsyncMock(return_value=gemini_payload)):
            result = await build_group_opportunities_recommendation(session, business_id="b1", max_results=3)

        self.assertEqual(result["source"], "gemini")
        self.assertEqual(result["opportunities"][0]["supplier_product_id"], "sp1")
