import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from app.core.config import get_settings


def _component(components: list[dict[str, object]], key: str) -> str | None:
    for comp in components:
        types = comp.get("types", [])
        if key in types:
            val = comp.get("long_name") or comp.get("short_name")
            return str(val) if val is not None else None
    return None


def geocode_address(address: str) -> dict[str, object] | None:
    settings = get_settings()
    if not settings.google_maps_api_key:
        return None

    query = urlencode(
        {
            "address": address,
            "key": settings.google_maps_api_key,
        }
    )
    url = f"https://maps.googleapis.com/maps/api/geocode/json?{query}"

    try:
        with urlopen(url, timeout=10.0) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError):
        return None

    if payload.get("status") != "OK":
        return None

    results = payload.get("results") or []
    if not results:
        return None

    first = results[0]
    location = first.get("geometry", {}).get("location", {})
    lat = location.get("lat")
    lng = location.get("lng")
    if lat is None or lng is None:
        return None

    comps = first.get("address_components", [])
    return {
        "latitude": float(lat),
        "longitude": float(lng),
        "locality": _component(comps, "locality"),
        "admin_area_level_1": _component(comps, "administrative_area_level_1"),
        "country": _component(comps, "country"),
        "postal_code": _component(comps, "postal_code"),
        "formatted_address": first.get("formatted_address"),
    }
