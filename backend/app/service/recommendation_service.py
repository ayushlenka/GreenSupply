from __future__ import annotations

import asyncio
import json
import logging
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.service.group_service import get_group_details, get_group_impact, list_active_groups

logger = logging.getLogger(__name__)


def _extract_json_object(text: str) -> dict[str, object] | None:
    text = text.strip()
    if not text:
        return None

    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        pass

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None

    try:
        parsed = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


def _normalize_output_keys(payload: dict[str, object]) -> dict[str, str]:
    aliases = {
        "executiveSummary": "executive_summary",
        "keyInsight": "key_insight",
        "actionPlan": "action_plan",
        "cityScaleProjection": "city_scale_projection",
        "recommendedPackaging": "recommended_packaging",
        "sustainabilityReport": "sustainability_report",
    }
    normalized: dict[str, str] = {}
    for key, value in payload.items():
        normalized_key = aliases.get(str(key), str(key))
        normalized[normalized_key] = str(value)
    return normalized


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


def _dashboard_fallback_recommendation(
    summary: dict[str, float | int],
    *,
    city_businesses: int,
    business_name: str | None,
) -> dict[str, str]:
    audience = business_name or "your business network"
    return {
        "executive_summary": (
            f"{audience} is building measurable procurement momentum; the next gains come from moving active groups "
            "to confirmation faster and concentrating participation in high-volume categories."
        ),
        "key_insight": (
            f"There are {summary['near_completion_groups']} groups close to completion and {summary['stalled_groups']} groups "
            "at risk of stalling, so focused outreach can unlock impact faster than opening many new groups."
        ),
        "action_plan": (
            "Prioritize near-complete groups first, run targeted outreach to under-filled groups, and standardize preferred "
            "supplier SKUs so repeat orders become easier for businesses to join."
        ),
        "city_scale_projection": (
            f"If {city_businesses} SF businesses participate at similar rates, yearly impact is estimated at "
            f"{summary['city_yearly_co2_kg']:.2f} kg CO2 avoided, {summary['city_yearly_plastic_kg']:.2f} kg plastic avoided, "
            f"and {summary['city_yearly_miles_saved']:.2f} delivery miles saved."
        ),
    }


def _build_dashboard_prompt(
    summary: dict[str, float | int],
    *,
    city_businesses: int,
    business_name: str | None,
) -> str:
    audience = business_name or "small SF businesses"
    return (
        "You are a climate-impact and operations analyst for a cooperative procurement platform.\n"
        "Return valid JSON with keys: executive_summary, key_insight, action_plan, city_scale_projection.\n"
        "Keep each value concise and production-oriented for business users.\n"
        "Do not simply restate all metrics; prioritize interpretation, bottlenecks, and next actions.\n"
        "Use numbers selectively for decisions.\n"
        "Do not invent numbers not provided below.\n\n"
        f"Audience: {audience}\n"
        f"Active groups: {summary['active_groups']}\n"
        f"Confirmed groups: {summary['confirmed_groups']}\n"
        f"Participating businesses: {summary['businesses_participating']}\n"
        f"Average group progress pct: {summary['avg_group_progress_pct']}\n"
        f"Near-completion groups: {summary['near_completion_groups']}\n"
        f"Stalled groups: {summary['stalled_groups']}\n"
        f"Total savings USD: {summary['total_savings_usd']}\n"
        f"Total CO2 reduced kg: {summary['total_co2_kg']}\n"
        f"Total plastic avoided kg: {summary['total_plastic_kg']}\n"
        f"Delivery trips reduced: {summary['total_trips_reduced']}\n"
        f"Delivery miles saved: {summary['total_miles_saved']}\n"
        f"City businesses projection input: {city_businesses}\n"
        f"Projected yearly CO2 reduced kg: {summary['city_yearly_co2_kg']}\n"
        f"Projected yearly plastic avoided kg: {summary['city_yearly_plastic_kg']}\n"
        f"Projected yearly delivery miles saved: {summary['city_yearly_miles_saved']}\n"
    )


async def _call_gemini(prompt: str) -> dict[str, str] | None:
    settings = get_settings()
    if not settings.gemini_api_key:
        return None

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "response_mime_type": "application/json",
        },
    }

    models_to_try = [settings.gemini_model, "gemini-1.5-flash"]
    seen_models: set[str] = set()

    def _request_with_model(model: str) -> dict[str, str] | None:
        endpoint = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            f"?key={settings.gemini_api_key}"
        )
        request = Request(
            endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(request, timeout=25.0) as response:
            data = json.loads(response.read().decode("utf-8"))

        candidates = data.get("candidates") or []
        if not candidates:
            return None
        parts = candidates[0].get("content", {}).get("parts", [])
        text = "".join(part.get("text", "") for part in parts).strip()
        if not text:
            return None

        parsed = _extract_json_object(text)
        if not parsed:
            logger.warning("Gemini output was not parseable JSON")
            return None
        return _normalize_output_keys(parsed)

    for model in models_to_try:
        if not model or model in seen_models:
            continue
        seen_models.add(model)
        try:
            result = await asyncio.to_thread(_request_with_model, model)
            if result:
                return result
        except HTTPError as exc:
            body = ""
            try:
                body = exc.read().decode("utf-8", errors="ignore")
            except Exception:
                body = ""
            logger.warning("Gemini HTTP error model=%s status=%s body=%s", model, exc.code, body[:800])
            continue
        except (URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
            logger.warning("Gemini request failed model=%s error=%s", model, exc)
            continue
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
    required = {"recommended_packaging", "tradeoffs", "sustainability_report"}
    if gemini_result and required.issubset(gemini_result.keys()):
        return {"group_id": group_id, "source": "gemini", **gemini_result}

    fallback = _fallback_recommendation(group_details, impact)
    return {"group_id": group_id, "source": "fallback", **fallback}


async def build_dashboard_recommendation(
    session: AsyncSession,
    *,
    business_name: str | None = None,
    city_businesses: int | None = None,
) -> dict[str, str]:
    groups = await list_active_groups(session)
    businesses_participating = int(sum(int(g.get("business_count", 0)) for g in groups))
    total_savings_usd = float(sum(float(g.get("estimated_savings_usd", 0.0)) for g in groups))
    total_co2_kg = float(sum(float(g.get("estimated_co2_saved_kg", 0.0)) for g in groups))
    total_plastic_kg = float(sum(float(g.get("estimated_plastic_avoided_kg", 0.0)) for g in groups))
    total_trips_reduced = int(sum(int(g.get("delivery_trips_reduced", 0)) for g in groups))
    total_miles_saved = float(sum(float(g.get("delivery_miles_saved", 0.0)) for g in groups))
    confirmed_groups = int(sum(1 for g in groups if str(g.get("status", "")).lower() == "confirmed"))
    avg_group_progress_pct = float(
        sum(float(g.get("progress_pct", 0.0)) for g in groups) / max(1, len(groups))
    )
    near_completion_groups = int(
        sum(
            1
            for g in groups
            if str(g.get("status", "")).lower() == "active"
            and float(g.get("progress_pct", 0.0)) >= 80.0
        )
    )
    stalled_groups = int(
        sum(
            1
            for g in groups
            if str(g.get("status", "")).lower() == "active"
            and float(g.get("progress_pct", 0.0)) < 30.0
        )
    )

    settings = get_settings()
    projected_businesses = city_businesses or settings.city_projection_businesses
    scale_denominator = max(1, businesses_participating)
    scale_factor = projected_businesses / scale_denominator

    summary = {
        "active_groups": len(groups),
        "confirmed_groups": confirmed_groups,
        "businesses_participating": businesses_participating,
        "avg_group_progress_pct": round(avg_group_progress_pct, 2),
        "near_completion_groups": near_completion_groups,
        "stalled_groups": stalled_groups,
        "total_savings_usd": round(total_savings_usd, 2),
        "total_co2_kg": round(total_co2_kg, 4),
        "total_plastic_kg": round(total_plastic_kg, 4),
        "total_trips_reduced": total_trips_reduced,
        "total_miles_saved": round(total_miles_saved, 2),
        "city_yearly_co2_kg": round(total_co2_kg * scale_factor * 12, 2),
        "city_yearly_plastic_kg": round(total_plastic_kg * scale_factor * 12, 2),
        "city_yearly_miles_saved": round(total_miles_saved * scale_factor * 12, 2),
    }

    prompt = _build_dashboard_prompt(
        summary,
        city_businesses=projected_businesses,
        business_name=business_name,
    )
    gemini_result = await _call_gemini(prompt)
    required = {"executive_summary", "key_insight", "action_plan", "city_scale_projection"}
    if gemini_result and required.issubset(gemini_result.keys()):
        return {"source": "gemini", **gemini_result}

    fallback = _dashboard_fallback_recommendation(
        summary,
        city_businesses=projected_businesses,
        business_name=business_name,
    )
    return {"source": "fallback", **fallback}
