from __future__ import annotations

import json
import math
from datetime import UTC, datetime, timedelta
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen
from zoneinfo import ZoneInfo

from app.core.config import get_settings

PACIFIC_TZ = ZoneInfo("America/Los_Angeles")


def next_business_day_start_utc(reference_utc: datetime | None = None) -> datetime:
    now_utc = reference_utc or datetime.now(UTC)
    if now_utc.tzinfo is None:
        now_utc = now_utc.replace(tzinfo=UTC)

    local = now_utc.astimezone(PACIFIC_TZ)
    next_day = local.date() + timedelta(days=1)
    while next_day.weekday() >= 5:
        next_day += timedelta(days=1)

    local_start = datetime(
        year=next_day.year,
        month=next_day.month,
        day=next_day.day,
        hour=8,
        minute=0,
        second=0,
        tzinfo=PACIFIC_TZ,
    )
    return local_start.astimezone(UTC)


def _haversine_miles(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 3958.8
    lat1r, lng1r = math.radians(lat1), math.radians(lng1)
    lat2r, lng2r = math.radians(lat2), math.radians(lng2)
    dlat = lat2r - lat1r
    dlng = lng2r - lng1r
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1r) * math.cos(lat2r) * math.sin(dlng / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _nearest_neighbor_route(
    supplier_point: tuple[float, float],
    stops: list[tuple[float, float]],
) -> list[tuple[float, float]]:
    remaining = stops[:]
    current = supplier_point
    route: list[tuple[float, float]] = [supplier_point]
    while remaining:
        idx = min(
            range(len(remaining)),
            key=lambda i: _haversine_miles(current[0], current[1], remaining[i][0], remaining[i][1]),
        )
        nxt = remaining.pop(idx)
        route.append(nxt)
        current = nxt
    return route


def _decode_polyline(encoded: str) -> list[list[float]]:
    points: list[list[float]] = []
    index = 0
    lat = 0
    lng = 0
    length = len(encoded)
    while index < length:
        shift = 0
        result = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlat = ~(result >> 1) if result & 1 else (result >> 1)
        lat += dlat

        shift = 0
        result = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlng = ~(result >> 1) if result & 1 else (result >> 1)
        lng += dlng
        points.append([lng / 1e5, lat / 1e5])
    return points


def _fetch_directions_request(
    *,
    origin_point: tuple[float, float],
    destination_point: tuple[float, float],
    waypoint_points: list[tuple[float, float]],
) -> tuple[list[list[float]] | None, float | None, float | None]:
    settings = get_settings()
    if not settings.google_maps_api_key:
        return None, None, None

    origin = f"{origin_point[0]},{origin_point[1]}"
    destination = f"{destination_point[0]},{destination_point[1]}"

    params = {
        "origin": origin,
        "destination": destination,
        "mode": "driving",
        "key": settings.google_maps_api_key,
    }
    if waypoint_points:
        params["waypoints"] = "optimize:true|" + "|".join(f"{lat},{lng}" for lat, lng in waypoint_points)

    url = f"https://maps.googleapis.com/maps/api/directions/json?{urlencode(params)}"
    try:
        with urlopen(url, timeout=12.0) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError):
        return None, None, None

    if payload.get("status") != "OK":
        return None, None, None
    routes = payload.get("routes") or []
    if not routes:
        return None, None, None
    route = routes[0]
    polyline = route.get("overview_polyline", {}).get("points")
    legs = route.get("legs") or []
    total_meters = sum(float(leg.get("distance", {}).get("value", 0) or 0) for leg in legs)
    total_seconds = sum(float(leg.get("duration", {}).get("value", 0) or 0) for leg in legs)
    if not polyline:
        return None, None, None
    return _decode_polyline(polyline), total_meters / 1609.344, total_seconds / 60.0


def _fetch_optimized_directions(
    supplier_point: tuple[float, float],
    destination_points: list[tuple[float, float]],
) -> tuple[list[list[float]] | None, float | None, float | None]:
    settings = get_settings()
    if not settings.google_maps_api_key or len(destination_points) == 0:
        return None, None, None

    # For a single stop, this is just one direct driving route.
    if len(destination_points) == 1:
        return _fetch_directions_request(
            origin_point=supplier_point,
            destination_point=destination_points[0],
            waypoint_points=[],
        )

    # Try each stop as the final destination and let Google optimize intermediate waypoints.
    # Keep this bounded to avoid excessive API usage on very large groups.
    candidate_indexes = range(min(len(destination_points), 10))
    best_points: list[list[float]] | None = None
    best_miles: float | None = None
    best_minutes: float | None = None
    for destination_index in candidate_indexes:
        destination_point = destination_points[destination_index]
        waypoint_points = [p for i, p in enumerate(destination_points) if i != destination_index]
        points, miles, minutes = _fetch_directions_request(
            origin_point=supplier_point,
            destination_point=destination_point,
            waypoint_points=waypoint_points,
        )
        if points is None or miles is None or minutes is None:
            continue
        if best_minutes is None or minutes < best_minutes:
            best_points = points
            best_miles = miles
            best_minutes = minutes
    return best_points, best_miles, best_minutes


def compute_delivery_route(
    *,
    supplier_latitude: float,
    supplier_longitude: float,
    destination_points: list[tuple[float, float]],
) -> tuple[list[list[float]], float, float]:
    supplier_point = (supplier_latitude, supplier_longitude)
    directions_points, directions_miles, directions_minutes = _fetch_optimized_directions(
        supplier_point,
        destination_points,
    )
    if directions_points and directions_miles is not None and directions_minutes is not None:
        return directions_points, float(directions_miles), float(directions_minutes)

    ordered = _nearest_neighbor_route(
        supplier_point,
        destination_points,
    )
    fallback_points = [[lng, lat] for lat, lng in ordered]
    total_miles = 0.0
    for i in range(1, len(ordered)):
        total_miles += _haversine_miles(
            ordered[i - 1][0],
            ordered[i - 1][1],
            ordered[i][0],
            ordered[i][1],
        )

    avg_speed_mph = 22.0
    base_minutes = (total_miles / avg_speed_mph) * 60.0
    stop_buffer_minutes = max(0, len(destination_points) - 1) * 4.0
    return fallback_points, float(total_miles), float(base_minutes + stop_buffer_minutes)
