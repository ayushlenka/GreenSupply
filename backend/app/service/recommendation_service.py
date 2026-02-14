from __future__ import annotations

import asyncio
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.service.group_service import get_group_details, get_group_impact


def _fallback_recommendation(group_details: dict[str, object], impact: dict[str, object]) -> dict[str, str]:
    product = group_details["product"]
    return {
        "recommended_packaging": (
            f"Use {product['material']} {product['category']} options such as {product['name']} "
            "to meet compostable packaging goals while reducing unit cost in bulk groups."
        ),
        "tradeoffs": (
            "Compostable materials often need proper collection/compost streams and may have "
            "higher retail pricing outside bulk purchase windows."
        ),
        "sustainability_report": (
            f"This group currently avoids about {impact['estimated_plastic_avoided_kg']} kg plastic and "
            f"{impact['estimated_co2_saved_kg']} kg CO2, while reducing about {impact['delivery_trips_reduced']} "
            f"delivery trips and saving roughly {impact['delivery_miles_saved']} miles."
        ),
    }


def _build_prompt(group_details: dict[str, object], impact: dict[str, object], constraints: str | None) -> str:
    product = group_details["product"]
    constraints_text = constraints or "No extra constraints provided."
    return (
        "You are sustainability advisor for small food businesses.\n"
        "Return valid JSON with keys: recommended_packaging, tradeoffs, sustainability_report.\n"
        "Keep each value concise and practical.\n\n"
        f"Product name: {product['name']}\n"
        f"Category: {product['category']}\n"
        f"Material: {product['material']}\n"
        f"Certifications: {', '.join(product['certifications'])}\n"
        f"Current units: {group_details['current_units']}\n"
        f"Target units: {group_details['target_units']}\n"
        f"Estimated savings USD: {impact['estimated_savings_usd']}\n"
        f"Estimated CO2 saved kg: {impact['estimated_co2_saved_kg']}\n"
        f"Estimated plastic avoided kg: {impact['estimated_plastic_avoided_kg']}\n"
        f"Delivery miles saved: {impact['delivery_miles_saved']}\n"
        f"Constraints: {constraints_text}\n"
    )


async def _call_gemini(prompt: str) -> dict[str, str] | None:
    settings = get_settings()
    if not settings.gemini_api_key:
        return None

    model = settings.gemini_model
    endpoint = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        f"?key={settings.gemini_api_key}"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2},
    }

    def _request() -> dict[str, str] | None:
        request = Request(
            endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(request, timeout=20.0) as response:
            data = json.loads(response.read().decode("utf-8"))

        candidates = data.get("candidates") or []
        if not candidates:
            return None
        parts = candidates[0].get("content", {}).get("parts", [])
        text = "".join(part.get("text", "") for part in parts).strip()
        if not text:
            return None

        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            return {
                "recommended_packaging": text,
                "tradeoffs": "Review composting collection and material compliance requirements.",
                "sustainability_report": "AI returned unstructured output; verify details against dashboard metrics.",
            }

        required = {"recommended_packaging", "tradeoffs", "sustainability_report"}
        if not required.issubset(parsed.keys()):
            return None
        return {
            "recommended_packaging": str(parsed["recommended_packaging"]),
            "tradeoffs": str(parsed["tradeoffs"]),
            "sustainability_report": str(parsed["sustainability_report"]),
        }

    try:
        return await asyncio.to_thread(_request)
    except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError):
        return None


async def build_group_recommendation(
    session: AsyncSession,
    *,
    group_id: str,
    constraints: str | None = None,
) -> dict[str, str]:
    group_details = await get_group_details(session, group_id)
    if not group_details:
        raise ValueError("Group not found")

    impact = await get_group_impact(session, group_id)
    if not impact:
        raise ValueError("Group impact not available")

    prompt = _build_prompt(group_details, impact, constraints)
    gemini_result = await _call_gemini(prompt)
    if gemini_result:
        return {"group_id": group_id, "source": "gemini", **gemini_result}

    fallback = _fallback_recommendation(group_details, impact)
    return {"group_id": group_id, "source": "fallback", **fallback}
