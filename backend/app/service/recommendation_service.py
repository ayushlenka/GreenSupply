from __future__ import annotations

import asyncio
import json
import logging
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.models.business import Business
from app.service.group_service import get_group_details, get_group_impact, list_active_groups
from app.service.supplier_service import get_reserved_units_by_supplier_product, list_supplier_products

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
    raw = await _call_gemini_object(prompt)
    if not raw:
        return None
    return _normalize_output_keys(raw)


async def _call_gemini_object(prompt: str) -> dict[str, object] | None:
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

    models_to_try = [
        settings.gemini_model,
        "gemini-2.0-flash",
        "gemini-flash-latest",
    ]
    seen_models: set[str] = set()

    def _request_with_model(model: str) -> dict[str, object] | None:
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
        return parsed

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


def _format_opportunity_fallback(
    *,
    supplier_business_id: str,
    supplier_business_name: str | None,
    supplier_product_id: str,
    product_name: str,
    category: str,
    material: str,
    unit_price: float,
    available_units: int,
    category_demand_units: int,
    max_results_index: int,
) -> dict[str, object]:
    demand_seed = category_demand_units if category_demand_units > 0 else int(available_units * 0.45)
    target_units = max(1, min(available_units, max(int(demand_seed * 1.1), 500)))
    min_businesses = max(2, min(6, round(target_units / 1500)))
    deadline_days = 5 if category_demand_units >= 1500 else 7
    initial_commitment = max(1, min(target_units, max(int(target_units / max(min_businesses, 1)), 100)))

    return {
        "supplier_business_id": supplier_business_id,
        "supplier_business_name": supplier_business_name,
        "supplier_product_id": supplier_product_id,
        "product_name": product_name,
        "category": category,
        "material": material,
        "recommended_target_units": int(target_units),
        "recommended_min_businesses_required": int(min_businesses),
        "recommended_deadline_days": int(deadline_days),
        "recommended_initial_commitment_units": int(initial_commitment),
        "outreach_copy": (
            f"Launching a neighborhood order for {product_name}. "
            f"We can unlock approx ${unit_price:.2f}/unit bulk pricing if {min_businesses} businesses join in {deadline_days} days."
        ),
        "reasoning": (
            "Recommendation balances current supplier availability with observed category demand in active local groups."
        ),
        "evidence_used": (
            f"Available inventory: {available_units} units. "
            f"Regional demand signal for {category}: {category_demand_units} committed units."
        ),
        "risk_note": (
            "If participation is slow in the first 48 hours, increase outreach urgency or lower target units."
        ),
        "_rank_score": category_demand_units + int(available_units * 0.2) - (max_results_index * 5),
    }


def _build_group_opportunities_prompt(
    *,
    business_name: str | None,
    region_id: int | None,
    constraints: str | None,
    candidates: list[dict[str, object]],
    max_results: int,
) -> str:
    return (
        "You are an operations copilot for a cooperative procurement platform.\n"
        "Return valid JSON with key opportunities (array).\n"
        "Each opportunity object must include exactly these keys:\n"
        "supplier_business_id, supplier_business_name, supplier_product_id, product_name, category, material,\n"
        "recommended_target_units, recommended_min_businesses_required, recommended_deadline_days,\n"
        "recommended_initial_commitment_units, outreach_copy, reasoning, evidence_used, risk_note.\n"
        "Use only supplier_product_ids that exist in provided candidates.\n"
        "Do not invent supplier IDs or products.\n"
        f"Return at most {max_results} opportunities.\n\n"
        f"Business name: {business_name or 'Unknown business'}\n"
        f"Region id: {region_id}\n"
        f"Constraints: {constraints or 'None provided'}\n"
        f"Candidates JSON: {json.dumps(candidates)}\n"
    )


def _sanitize_ai_group_opportunities(
    ai_payload: dict[str, object],
    *,
    allowed_supplier_product_ids: set[str],
    max_results: int,
) -> list[dict[str, object]]:
    opportunities_raw = ai_payload.get("opportunities")
    if not isinstance(opportunities_raw, list):
        return []

    cleaned: list[dict[str, object]] = []
    for entry in opportunities_raw:
        if not isinstance(entry, dict):
            continue
        supplier_product_id = str(entry.get("supplier_product_id", "")).strip()
        if not supplier_product_id or supplier_product_id not in allowed_supplier_product_ids:
            continue
        try:
            cleaned.append(
                {
                    "supplier_business_id": str(entry.get("supplier_business_id", "")).strip(),
                    "supplier_business_name": (
                        str(entry.get("supplier_business_name")).strip()
                        if entry.get("supplier_business_name") is not None
                        else None
                    ),
                    "supplier_product_id": supplier_product_id,
                    "product_name": str(entry.get("product_name", "")).strip(),
                    "category": str(entry.get("category", "")).strip(),
                    "material": str(entry.get("material", "")).strip(),
                    "recommended_target_units": max(1, int(entry.get("recommended_target_units", 1))),
                    "recommended_min_businesses_required": max(1, int(entry.get("recommended_min_businesses_required", 1))),
                    "recommended_deadline_days": max(1, int(entry.get("recommended_deadline_days", 1))),
                    "recommended_initial_commitment_units": max(1, int(entry.get("recommended_initial_commitment_units", 1))),
                    "outreach_copy": str(entry.get("outreach_copy", "")).strip(),
                    "reasoning": str(entry.get("reasoning", "")).strip(),
                    "evidence_used": str(entry.get("evidence_used", "")).strip(),
                    "risk_note": str(entry.get("risk_note", "")).strip(),
                }
            )
        except (ValueError, TypeError):
            continue
        if len(cleaned) >= max_results:
            break
    return cleaned


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


async def build_group_opportunities_recommendation(
    session: AsyncSession,
    *,
    business_id: str,
    max_results: int = 3,
    constraints: str | None = None,
) -> dict[str, object]:
    if max_results <= 0:
        raise ValueError("max_results must be greater than 0")

    business = await session.get(Business, business_id)
    if not business:
        raise ValueError("Business not found")
    if business.account_type != "business":
        raise ValueError("Only business accounts can request group opportunities")
    if business.region_id is None:
        raise ValueError("Business must be assigned to a region")

    supplier_products = await list_supplier_products(session)
    if not supplier_products:
        return {"source": "fallback", "region_id": business.region_id, "opportunities": []}

    reserved_by_product = await get_reserved_units_by_supplier_product(session, [sp.id for sp in supplier_products])
    groups_in_region = await list_active_groups(session, region_id=business.region_id)
    active_supplier_product_ids = {
        str(g.get("supplier_product_id"))
        for g in groups_in_region
        if g.get("supplier_product_id")
    }

    category_demand_units: dict[str, int] = {}
    for g in groups_in_region:
        category = str((g.get("product") or {}).get("category") or "").strip().lower()
        if not category:
            continue
        category_demand_units[category] = category_demand_units.get(category, 0) + int(g.get("current_units", 0) or 0)

    supplier_ids = sorted({sp.supplier_business_id for sp in supplier_products if sp.supplier_business_id})
    supplier_names_by_id: dict[str, str | None] = {}
    if supplier_ids:
        supplier_names_result = await session.execute(
            select(Business.id, Business.name).where(Business.id.in_(supplier_ids))
        )
        supplier_names_by_id = {str(sid): name for sid, name in supplier_names_result.all()}

    fallback_candidates: list[dict[str, object]] = []
    for idx, sp in enumerate(supplier_products):
        available = max(0, int(sp.available_units) - int(reserved_by_product.get(sp.id, 0)))
        if available <= 0:
            continue
        if sp.id in active_supplier_product_ids:
            continue
        category = str(sp.category or "").strip().lower()
        demand_units = int(category_demand_units.get(category, 0))
        fallback_candidates.append(
            _format_opportunity_fallback(
                supplier_business_id=sp.supplier_business_id,
                supplier_business_name=supplier_names_by_id.get(sp.supplier_business_id),
                supplier_product_id=sp.id,
                product_name=sp.name,
                category=sp.category,
                material=sp.material,
                unit_price=float(sp.unit_price),
                available_units=available,
                category_demand_units=demand_units,
                max_results_index=idx,
            )
        )

    if not fallback_candidates:
        return {"source": "fallback", "region_id": business.region_id, "opportunities": []}

    fallback_candidates.sort(key=lambda c: int(c.get("_rank_score", 0)), reverse=True)
    fallback_trimmed = fallback_candidates[: max_results]
    fallback_for_prompt = [
        {k: v for k, v in candidate.items() if k != "_rank_score"}
        for candidate in fallback_trimmed
    ]
    allowed_ids = {str(c["supplier_product_id"]) for c in fallback_for_prompt}

    prompt = _build_group_opportunities_prompt(
        business_name=business.name,
        region_id=business.region_id,
        constraints=constraints,
        candidates=fallback_for_prompt,
        max_results=max_results,
    )
    gemini_raw = await _call_gemini_object(prompt)
    if gemini_raw:
        ai_opportunities = _sanitize_ai_group_opportunities(
            gemini_raw,
            allowed_supplier_product_ids=allowed_ids,
            max_results=max_results,
        )
        if ai_opportunities:
            return {
                "source": "gemini",
                "region_id": business.region_id,
                "opportunities": ai_opportunities,
            }

    for candidate in fallback_trimmed:
        candidate.pop("_rank_score", None)
    return {
        "source": "fallback",
        "region_id": business.region_id,
        "opportunities": fallback_trimmed,
    }
