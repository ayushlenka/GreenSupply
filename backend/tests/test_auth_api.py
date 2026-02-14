import unittest

from app.api.auth import get_me
from app.core.auth import AuthenticatedUser


class TestAuthApi(unittest.IsolatedAsyncioTestCase):
    async def test_get_me_returns_expected_payload(self):
        user = AuthenticatedUser(
            user_id="user-123",
            email="test@example.com",
            role="authenticated",
            claims={"aud": "authenticated"},
        )

        result = await get_me(user)

        self.assertEqual(
            result,
            {
                "user_id": "user-123",
                "email": "test@example.com",
                "role": "authenticated",
            },
        )
