import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.audit import Audit, AuditResult
from app.models.plot import Plot
from app.models.subsidy import SubsidyDecision
from app.models.evidence import EvidencePhoto
from app.config import settings


async def evaluate_subsidy_decision(
    session: AsyncSession,
    plot_id: uuid.UUID,
    audit_id: uuid.UUID,
    decided_by: Optional[uuid.UUID] = None,
    program_id: str = "PROBOSQUE_REFORESTATION_2026",
    rules_version: str = "RULES-1.0",
    survival_threshold_pct: float = 80.0,
    ci_policy: str = "POINT_ESTIMATE",  # POINT_ESTIMATE | CONSERVATIVE_CI_LOWER
    override_decision: Optional[str] = None,
    override_reason: Optional[str] = None,
) -> SubsidyDecision:
    """
    Evaluates versioned subsidy rules over a completed field audit and server-computed audit result.
    Does NOT depend directly on satellite triage.
    """
    # Load audit and audit result
    audit_q = select(Audit).where(Audit.id == audit_id)
    audit_res = await session.execute(audit_q)
    audit = audit_res.scalar_one_or_none()

    if not audit:
        raise ValueError(f"Audit {audit_id} not found")

    result_q = select(AuditResult).where(AuditResult.audit_id == audit_id)
    result_res = await session.execute(result_q)
    audit_result = result_res.scalar_one_or_none()

    if not audit_result:
        raise ValueError(f"AuditResult not found for audit {audit_id}. Finalize audit first.")

    # Load photos for audit
    photos_q = select(EvidencePhoto).where(EvidencePhoto.audit_id == audit_id)
    photos_res = await session.execute(photos_q)
    photos = list(photos_res.scalars().all())

    overview_photos = [p for p in photos if p.evidence_type == "PLOT_OVERVIEW"]
    has_overview_photo = len(overview_photos) > 0

    reason_codes: List[str] = []
    
    # 1. Survival evaluation
    point_estimate = float(audit_result.estimated_survival_pct)
    ci_low = float(audit_result.ci_low_pct) if audit_result.ci_low_pct is not None else None

    evaluated_value = ci_low if (ci_policy == "CONSERVATIVE_CI_LOWER" and ci_low is not None) else point_estimate
    meets_survival = evaluated_value >= survival_threshold_pct

    if not meets_survival:
        reason_codes.append("SURVIVAL_BELOW_THRESHOLD")

    # 2. Geofence evaluation
    geofence_valid = audit.geofence_valid
    if not geofence_valid:
        reason_codes.append("GEOFENCE_INVALID")

    # 3. Evidence completeness evaluation
    if not has_overview_photo:
        reason_codes.append("MISSING_OVERVIEW_PHOTO")

    # 4. Sampling count evaluation
    if audit_result.sampling_units_count < 2:
        reason_codes.append("INSUFFICIENT_SAMPLING_UNITS")

    # Determine automated decision
    if override_decision:
        final_decision = override_decision
        if override_reason:
            reason_codes.append(f"OVERRIDE: {override_reason}")
    else:
        if "GEOFENCE_INVALID" in reason_codes:
            final_decision = "MANUAL_REVIEW"
        elif "MISSING_OVERVIEW_PHOTO" in reason_codes or "INSUFFICIENT_SAMPLING_UNITS" in reason_codes:
            final_decision = "MANUAL_REVIEW"
        elif meets_survival:
            final_decision = "APPROVED"
        else:
            final_decision = "REJECTED"

    decision_basis: Dict[str, Any] = {
        "program_id": program_id,
        "rules_version": rules_version,
        "ci_policy": ci_policy,
        "survival_threshold_pct": survival_threshold_pct,
        "estimated_survival_pct": point_estimate,
        "ci_low_pct": ci_low,
        "ci_high_pct": float(audit_result.ci_high_pct) if audit_result.ci_high_pct is not None else None,
        "evaluated_value": evaluated_value,
        "geofence_valid": geofence_valid,
        "has_overview_photo": has_overview_photo,
        "total_photos_count": len(photos),
        "sampling_units_count": audit_result.sampling_units_count,
        "alive_total": audit_result.alive_total,
        "denominator_total": audit_result.denominator_total,
    }

    decision_record = SubsidyDecision(
        id=uuid.uuid4(),
        plot_id=plot_id,
        audit_id=audit_id,
        audit_result_id=audit_result.id,
        program_id=program_id,
        rules_version=rules_version,
        decision=final_decision,
        decision_basis=decision_basis,
        reason_codes=reason_codes,
        decided_by=decided_by,
        decided_at=datetime.now(timezone.utc),
    )

    session.add(decision_record)

    # Update plot subsidy_status
    plot_q = select(Plot).where(Plot.id == plot_id)
    plot_res = await session.execute(plot_q)
    plot = plot_res.scalar_one_or_none()
    if plot:
        plot.subsidy_status = final_decision

    await session.flush()
    return decision_record
