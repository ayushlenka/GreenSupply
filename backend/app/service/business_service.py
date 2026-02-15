from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.business import Business
from app.service.geocoding_service import geocode_address
from app.service.region_service import find_region_by_lat_lng, find_region_by_zip_fallback


async def create_business(
    session: AsyncSession,
    *,
    name: str | None,
    email: str | None,
    business_type: str | None,
    account_type: str,
    address: str | None,
    city: str | None,
    state: str | None,
    neighborhood: str | None,
    zip_code: str | None,
    latitude: float | None,
    longitude: float | None,
) -> Business:
    if account_type not in {"business", "supplier"}:
        raise ValueError("account_type must be either 'business' or 'supplier'")
    if account_type == "business" and not business_type:
        raise ValueError("business_type is required for business accounts")

    normalized_business_type = "supplier" if account_type == "supplier" else str(business_type).strip().lower()
    normalized_city = city.strip() if city else None
    normalized_state = state.strip() if state else None
    normalized_neighborhood = neighborhood.strip() if neighborhood else normalized_city

    resolved_latitude = latitude
    resolved_longitude = longitude
    if resolved_latitude is None or resolved_longitude is None:
        location_country = "United States"
        address_parts = [address, normalized_city, normalized_state, zip_code.strip() if zip_code else None, location_country]
        geocode_input = ", ".join([part.strip() for part in address_parts if part and part.strip()])
        if geocode_input.strip():
            geo = geocode_address(geocode_input)
            if geo:
                locality = (geo.get("locality") or "").strip().lower()
                admin_level_1 = (geo.get("admin_area_level_1") or "").strip().lower()
                country = (geo.get("country") or "").strip().lower()
                postal_code = str(geo.get("postal_code") or "").strip()

                in_sf = (
                    locality == "san francisco"
                    and admin_level_1 in {"ca", "california"}
                    and country in {"us", "united states"}
                    and postal_code.startswith("941")
                )
                in_us = country in {"us", "united states"}
                if account_type == "business" and not in_sf:
                    raise ValueError("Address geocoded outside San Francisco; only SF businesses are supported")
                if account_type == "supplier" and not in_us:
                    raise ValueError("Supplier address must be inside the United States")

                resolved_latitude = float(geo["latitude"])
                resolved_longitude = float(geo["longitude"])

    region = None
    if resolved_latitude is not None and resolved_longitude is not None:
        region = await find_region_by_lat_lng(session, resolved_latitude, resolved_longitude)
    if region is None:
        region = await find_region_by_zip_fallback(session, zip_code)
    if account_type == "business" and region is None:
        raise ValueError("Could not assign region from address/coordinates")

    business = Business(
        id=str(uuid4()),
        name=name,
        email=(email.strip().lower() if email else None),
        business_type=normalized_business_type,
        account_type=account_type,
        address=address,
        city=normalized_city,
        state=normalized_state,
        neighborhood=normalized_neighborhood or "unknown",
        zip=zip_code,
        latitude=resolved_latitude,
        longitude=resolved_longitude,
        region_id=region.id if region else None,
        created_at=datetime.now(UTC),
    )
    session.add(business)
    await session.commit()
    await session.refresh(business)
    return business


async def get_business_by_id(session: AsyncSession, business_id: str) -> Business | None:
    result = await session.execute(select(Business).where(Business.id == business_id))
    return result.scalar_one_or_none()


async def get_business_by_email(session: AsyncSession, email: str) -> Business | None:
    normalized = email.strip().lower()
    result = await session.execute(select(Business).where(Business.email == normalized))
    return result.scalar_one_or_none()
