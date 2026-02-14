import unittest
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

from app.api.recommend import recommend_endpoint
from app.schemas.recommendation import RecommendationRequest


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
