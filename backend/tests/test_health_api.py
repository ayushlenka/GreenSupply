import unittest
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

from app.api import health


class TestHealthApi(unittest.IsolatedAsyncioTestCase):
    async def test_health_check_returns_ok(self):
        result = await health.health_check()
        self.assertEqual(result["status"], "ok")
        self.assertIn("service", result)

    async def test_db_health_check_connected(self):
        with patch("app.api.health.check_db_connection", new=AsyncMock(return_value=(True, "ok"))):
            result = await health.db_health_check()

        self.assertEqual(result, {"status": "ok", "db": "connected"})

    async def test_db_health_check_disconnected(self):
        with patch(
            "app.api.health.check_db_connection",
            new=AsyncMock(return_value=(False, "TimeoutError: TimeoutError()")),
        ):
            with self.assertRaises(HTTPException) as ctx:
                await health.db_health_check()

        self.assertEqual(ctx.exception.status_code, 503)
        self.assertEqual(ctx.exception.detail["status"], "error")
        self.assertEqual(ctx.exception.detail["db"], "disconnected")
