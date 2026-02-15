import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from app.service.business_service import create_business


class _Session:
    def __init__(self):
        self.added = []

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        return None

    async def refresh(self, _obj):
        return None


class TestBusinessService(unittest.IsolatedAsyncioTestCase):
    async def test_rejects_non_sf_geocoded_address(self):
        session = _Session()
        geo = {
            "latitude": 38.5816,
            "longitude": -121.4944,
            "locality": "Sacramento",
            "admin_area_level_1": "CA",
            "country": "US",
            "postal_code": "95814",
        }

        with patch("app.service.business_service.geocode_address", return_value=geo), \
             patch("app.service.business_service.find_region_by_lat_lng", new=AsyncMock(return_value=None)), \
             patch("app.service.business_service.find_region_by_zip_fallback", new=AsyncMock(return_value=None)):
            with self.assertRaises(ValueError) as ctx:
                await create_business(
                    session,
                    name="Cafe Test",
                    email="owner@example.com",
                    business_type="cafe",
                    account_type="business",
                    address="123 Main St",
                    city="Sacramento",
                    state="CA",
                    neighborhood=None,
                    zip_code="95814",
                    latitude=None,
                    longitude=None,
                )

        self.assertIn("outside San Francisco", str(ctx.exception))

    async def test_assigns_region_from_geocoded_sf_address(self):
        session = _Session()
        region = SimpleNamespace(id=12)
        geo = {
            "latitude": 37.76,
            "longitude": -122.42,
            "locality": "San Francisco",
            "admin_area_level_1": "CA",
            "country": "US",
            "postal_code": "94103",
        }

        with patch("app.service.business_service.geocode_address", return_value=geo), \
             patch("app.service.business_service.find_region_by_lat_lng", new=AsyncMock(return_value=region)), \
             patch("app.service.business_service.find_region_by_zip_fallback", new=AsyncMock(return_value=None)):
            business = await create_business(
                session,
                name="Mission Cafe",
                email="Owner@Example.com",
                business_type="cafe",
                account_type="business",
                address="2900 16th St",
                city="San Francisco",
                state="CA",
                neighborhood=None,
                zip_code="94103",
                latitude=None,
                longitude=None,
            )

        self.assertEqual(business.region_id, 12)
        self.assertEqual(business.email, "owner@example.com")
        self.assertAlmostEqual(float(business.latitude), 37.76, places=2)
        self.assertEqual(business.city, "San Francisco")
        self.assertEqual(business.state, "CA")

    async def test_supplier_hard_locks_business_type_and_requires_us(self):
        session = _Session()
        geo = {
            "latitude": 51.5072,
            "longitude": -0.1276,
            "locality": "London",
            "admin_area_level_1": "England",
            "country": "United Kingdom",
            "postal_code": "SW1A",
        }

        with patch("app.service.business_service.geocode_address", return_value=geo), \
             patch("app.service.business_service.find_region_by_lat_lng", new=AsyncMock(return_value=None)), \
             patch("app.service.business_service.find_region_by_zip_fallback", new=AsyncMock(return_value=None)):
            with self.assertRaises(ValueError) as ctx:
                await create_business(
                    session,
                    name="Supplier Co",
                    email="s@example.com",
                    business_type="bakery",
                    account_type="supplier",
                    address="10 Downing St",
                    city="London",
                    state="England",
                    neighborhood=None,
                    zip_code="SW1A",
                    latitude=None,
                    longitude=None,
                )

        self.assertIn("inside the United States", str(ctx.exception))

    async def test_supplier_hard_locks_business_type_value(self):
        session = _Session()
        geo = {
            "latitude": 40.7128,
            "longitude": -74.0060,
            "locality": "New York",
            "admin_area_level_1": "NY",
            "country": "US",
            "postal_code": "10001",
        }

        with patch("app.service.business_service.geocode_address", return_value=geo), \
             patch("app.service.business_service.find_region_by_lat_lng", new=AsyncMock(return_value=None)), \
             patch("app.service.business_service.find_region_by_zip_fallback", new=AsyncMock(return_value=None)):
            supplier = await create_business(
                session,
                name="Supplier Co",
                email="supplier@example.com",
                business_type="bakery",
                account_type="supplier",
                address="5th Avenue",
                city="New York",
                state="NY",
                neighborhood=None,
                zip_code="10001",
                latitude=None,
                longitude=None,
            )

        self.assertEqual(supplier.business_type, "supplier")
