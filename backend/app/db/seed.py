from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.product import Product
from app.db.models.region import Region

SEED_PRODUCTS = [
    {
        "id": "6e2f12c8-f385-4ef4-b515-d6c7b793e7d1",
        "name": "9x9 Bagasse Clamshell",
        "category": "clamshell",
        "material": "bagasse",
        "certifications": ["BPI", "ASTM D6400"],
        "retail_unit_price": 0.32,
        "bulk_unit_price": 0.24,
        "min_bulk_units": 5000,
        "co2_per_unit_kg": 0.021,
        "plastic_avoided_per_unit_kg": 0.012,
    },
    {
        "id": "91688e10-30ce-45fc-a229-34d67ca994dc",
        "name": "12oz Compostable Cup",
        "category": "cup",
        "material": "paper",
        "certifications": ["BPI"],
        "retail_unit_price": 0.19,
        "bulk_unit_price": 0.14,
        "min_bulk_units": 8000,
        "co2_per_unit_kg": 0.014,
        "plastic_avoided_per_unit_kg": 0.008,
    },
    {
        "id": "5ec96764-35fa-48af-96d5-7c63dcb6d7b8",
        "name": "Cold Cup Lid (PLA)",
        "category": "cup",
        "material": "PLA",
        "certifications": ["ASTM D6400"],
        "retail_unit_price": 0.09,
        "bulk_unit_price": 0.06,
        "min_bulk_units": 10000,
        "co2_per_unit_kg": 0.006,
        "plastic_avoided_per_unit_kg": 0.004,
    },
    {
        "id": "828cf460-4c87-4fa4-998b-2f902fd2dbf4",
        "name": "Compostable Fork",
        "category": "utensil",
        "material": "CPLA",
        "certifications": ["BPI"],
        "retail_unit_price": 0.07,
        "bulk_unit_price": 0.045,
        "min_bulk_units": 12000,
        "co2_per_unit_kg": 0.0035,
        "plastic_avoided_per_unit_kg": 0.0028,
    },
    {
        "id": "04ec188a-88d4-4a79-98dc-a95f2958f4a8",
        "name": "Compostable Spoon",
        "category": "utensil",
        "material": "CPLA",
        "certifications": ["BPI"],
        "retail_unit_price": 0.07,
        "bulk_unit_price": 0.045,
        "min_bulk_units": 12000,
        "co2_per_unit_kg": 0.0035,
        "plastic_avoided_per_unit_kg": 0.0028,
    },
    {
        "id": "21ec935b-c719-4261-a4f6-c1cc47ca5e3e",
        "name": "Takeout Paper Bag",
        "category": "bag",
        "material": "kraft paper",
        "certifications": ["FSC"],
        "retail_unit_price": 0.15,
        "bulk_unit_price": 0.1,
        "min_bulk_units": 6000,
        "co2_per_unit_kg": 0.009,
        "plastic_avoided_per_unit_kg": 0.007,
    },
    {
        "id": "d576f2f7-4e17-42a8-95a7-f1e8e8ff5cf6",
        "name": "8oz Soup Container",
        "category": "container",
        "material": "paper",
        "certifications": ["BPI"],
        "retail_unit_price": 0.26,
        "bulk_unit_price": 0.2,
        "min_bulk_units": 7000,
        "co2_per_unit_kg": 0.016,
        "plastic_avoided_per_unit_kg": 0.01,
    },
    {
        "id": "76d474e9-3d92-4e02-be73-4f9edec49de5",
        "name": "Fiber Tray",
        "category": "tray",
        "material": "molded fiber",
        "certifications": ["BPI", "FSC"],
        "retail_unit_price": 0.22,
        "bulk_unit_price": 0.16,
        "min_bulk_units": 5500,
        "co2_per_unit_kg": 0.013,
        "plastic_avoided_per_unit_kg": 0.009,
    },
    {
        "id": "6c50fca0-6bb0-496f-ae44-885d6646ec5a",
        "name": "Compostable Straw",
        "category": "straw",
        "material": "PLA",
        "certifications": ["BPI"],
        "retail_unit_price": 0.045,
        "bulk_unit_price": 0.03,
        "min_bulk_units": 20000,
        "co2_per_unit_kg": 0.002,
        "plastic_avoided_per_unit_kg": 0.0015,
    },
    {
        "id": "8bd1bf2d-8af5-4eb2-beea-a2be1f3da39f",
        "name": "Kraft Napkin",
        "category": "napkin",
        "material": "recycled paper",
        "certifications": ["FSC"],
        "retail_unit_price": 0.018,
        "bulk_unit_price": 0.011,
        "min_bulk_units": 30000,
        "co2_per_unit_kg": 0.0008,
        "plastic_avoided_per_unit_kg": 0.0006,
    },
]


async def seed_products(session: AsyncSession) -> None:
    existing = await session.execute(select(Product.id).limit(1))
    if existing.first() is not None:
        return

    for item in SEED_PRODUCTS:
        session.add(
            Product(
                id=item["id"],
                name=item["name"],
                category=item["category"],
                material=item["material"],
                certifications=item["certifications"],
                retail_unit_price=item["retail_unit_price"],
                bulk_unit_price=item["bulk_unit_price"],
                min_bulk_units=item["min_bulk_units"],
                co2_per_unit_kg=item["co2_per_unit_kg"],
                plastic_avoided_per_unit_kg=item["plastic_avoided_per_unit_kg"],
                created_at=datetime.now(UTC),
            )
        )

    await session.commit()


SF_CENTER_LAT = 37.7749
SF_CENTER_LNG = -122.4194
HALF_SPAN_MILES = 3.5
BLOCK_MILES = 2.0


def _miles_to_lat(miles: float) -> float:
    return miles / 69.0


def _miles_to_lng(miles: float, lat: float) -> float:
    from math import cos, radians

    return miles / (69.172 * max(cos(radians(lat)), 0.2))


async def seed_regions(session: AsyncSession) -> None:
    existing_sf = await session.execute(select(Region.id).where(Region.code.like("SF-%")).limit(1))
    if existing_sf.first() is not None:
        return

    total_span = HALF_SPAN_MILES * 2
    cells = int((total_span + BLOCK_MILES - 0.0001) // BLOCK_MILES)  # 4 cells for 7x7 with 2-mile blocks

    min_lat = SF_CENTER_LAT - _miles_to_lat(HALF_SPAN_MILES)
    max_lat = SF_CENTER_LAT + _miles_to_lat(HALF_SPAN_MILES)
    min_lng = SF_CENTER_LNG - _miles_to_lng(HALF_SPAN_MILES, SF_CENTER_LAT)
    max_lng = SF_CENTER_LNG + _miles_to_lng(HALF_SPAN_MILES, SF_CENTER_LAT)

    lat_step = (max_lat - min_lat) / cells
    lng_step = (max_lng - min_lng) / cells

    for row in range(cells):
        for col in range(cells):
            r_min_lat = min_lat + (row * lat_step)
            r_max_lat = min_lat + ((row + 1) * lat_step)
            r_min_lng = min_lng + (col * lng_step)
            r_max_lng = min_lng + ((col + 1) * lng_step)

            session.add(
                Region(
                    code=f"SF-{row + 1}-{col + 1}",
                    name=f"SF Block {row + 1}-{col + 1}",
                    row_index=row + 1,
                    col_index=col + 1,
                    min_lat=r_min_lat,
                    max_lat=r_max_lat,
                    min_lng=r_min_lng,
                    max_lng=r_max_lng,
                )
            )

    await session.commit()
