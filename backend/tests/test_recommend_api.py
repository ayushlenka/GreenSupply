import unittest
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

from app.api.recommend import recommend_dashboard_endpoint, recommend_endpoint, recommend_group_opportunities_endpoint
from app.schemas.recommendation import (
    DashboardRecommendationRequest,
    GroupOpportunitiesRequest,
    RecommendationRequest,
)


class TestRecommendApi(unittest.IsolatedAsyncioTestCase):
    async def test_recommend_endpoint_success(self):
        payload = RecommendationRequest(group_id="g1", constraints="Need microwave-safe")
        service_response = {
            "group_id": "g1",
            "source": "fallback",
            "recommended_packaging": "Use bagasse",
            "tradeoffs": "Needs compost stream",
            "sustainability_report": "Good impact",
        }

        with patch(
            "app.api.recommend.build_group_recommendation",
            new=AsyncMock(return_value=service_response),
        ):
            result = await recommend_endpoint(payload, db=object())

        self.assertEqual(result.group_id, "g1")
        self.assertEqual(result.source, "fallback")

    async def test_recommend_endpoint_group_not_found(self):
        payload = RecommendationRequest(group_id="missing")

        with patch(
            "app.api.recommend.build_group_recommendation",
            new=AsyncMock(side_effect=ValueError("Group not found")),
        ):
            with self.assertRaises(HTTPException) as ctx:
                await recommend_endpoint(payload, db=object())

        self.assertEqual(ctx.exception.status_code, 404)
        self.assertEqual(ctx.exception.detail, "Group not found")

    async def test_recommend_dashboard_endpoint_success(self):
        payload = DashboardRecommendationRequest(business_name="Mission Cafe")
        service_response = {
            "source": "fallback",
            "executive_summary": "Summary",
            "key_insight": "Insight",
            "action_plan": "Plan",
            "city_scale_projection": "Projection",
        }

        with patch(
            "app.api.recommend.build_dashboard_recommendation",
            new=AsyncMock(return_value=service_response),
        ):
            result = await recommend_dashboard_endpoint(payload, db=object())

        self.assertEqual(result.source, "fallback")
        self.assertEqual(result.executive_summary, "Summary")

    async def test_recommend_group_opportunities_endpoint_success(self):
        payload = GroupOpportunitiesRequest(business_id="b1", max_results=2)
        service_response = {
            "source": "fallback",
            "region_id": 2,
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
            ],
        }

        with patch(
            "app.api.recommend.build_group_opportunities_recommendation",
            new=AsyncMock(return_value=service_response),
        ):
            result = await recommend_group_opportunities_endpoint(payload, db=object())

        self.assertEqual(result.source, "fallback")
        self.assertEqual(len(result.opportunities), 1)

    async def test_recommend_group_opportunities_endpoint_bad_request(self):
        payload = GroupOpportunitiesRequest(business_id="b1", max_results=0)

        with patch(
            "app.api.recommend.build_group_opportunities_recommendation",
            new=AsyncMock(side_effect=ValueError("max_results must be greater than 0")),
        ):
            with self.assertRaises(HTTPException) as ctx:
                await recommend_group_opportunities_endpoint(payload, db=object())

        self.assertEqual(ctx.exception.status_code, 400)
