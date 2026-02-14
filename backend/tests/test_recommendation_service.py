import unittest
from unittest.mock import AsyncMock, patch

from app.service.recommendation_service import build_dashboard_recommendation, build_group_recommendation


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
