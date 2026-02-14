from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.product import Product

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
                created_at=datetime.utcnow(),
            )
        )

    await session.commit()
