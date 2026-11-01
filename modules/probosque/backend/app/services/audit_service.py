import math
import uuid
from typing import List, Tuple, Optional
from dataclasses import dataclass
from scipy import stats
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.audit import Audit, AuditSamplingUnit, AuditResult
from app.config import settings


@dataclass
class RatioEstimatorResult:
    sampling_units_count: int
    alive_total: int
    denominator_total: int
    estimated_survival_pct: float
    ci_low_pct: Optional[float]
    ci_high_pct: Optional[float]
    ci_method: Optional[str]
    confidence_level_pct: Optional[float]
    estimator_method: str = "RATIO_ESTIMATOR"


def calculate_survival_ratio_estimator(
    sampling_units: List[AuditSamplingUnit],
    confidence_level: float = 0.95
) -> RatioEstimatorResult:
    """
    Computes statistical survival estimation using the Ratio Estimator:
    p_hat_R = sum(y_i) / sum(x_i)
    
    Standard error computed from residuals:
    e_i = y_i - p_hat_R * x_i
    SE(p_hat_R) = sqrt( s_e^2 / (n * x_bar^2) )
    
    Student-t critical value for n - 1 degrees of freedom when n >= 2.
    """
    n = len(sampling_units)
    if n == 0:
        return RatioEstimatorResult(
            sampling_units_count=0,
            alive_total=0,
            denominator_total=0,
            estimated_survival_pct=0.0,
            ci_low_pct=None,
            ci_high_pct=None,
            ci_method=None,
            confidence_level_pct=None,
        )

    # Denominator x_i is either sampled_planting_sites or alive + dead
    y_values = [unit.alive_trees for unit in sampling_units]
    x_values = [
        unit.sampled_planting_sites if unit.sampled_planting_sites is not None and unit.sampled_planting_sites > 0
        else (unit.alive_trees + unit.dead_trees)
        for unit in sampling_units
    ]

    alive_total = sum(y_values)
    denominator_total = sum(x_values)

    if denominator_total == 0:
        return RatioEstimatorResult(
            sampling_units_count=n,
            alive_total=alive_total,
            denominator_total=0,
            estimated_survival_pct=0.0,
            ci_low_pct=None,
            ci_high_pct=None,
            ci_method="NOT_AVAILABLE",
            confidence_level_pct=confidence_level * 100.0,
        )

    p_hat_r = alive_total / denominator_total
    estimated_survival_pct = round(p_hat_r * 100.0, 3)

    if n < 2:
        return RatioEstimatorResult(
            sampling_units_count=n,
            alive_total=alive_total,
            denominator_total=denominator_total,
            estimated_survival_pct=estimated_survival_pct,
            ci_low_pct=None,
            ci_high_pct=None,
            ci_method="NOT_AVAILABLE",
            confidence_level_pct=confidence_level * 100.0,
        )

    x_bar = denominator_total / n
    residuals = [y - (p_hat_r * x) for y, x in zip(y_values, x_values)]
    
    # Sample variance of residuals (mean residual is mathematically 0)
    var_e = sum(e ** 2 for e in residuals) / (n - 1)
    
    if x_bar == 0 or var_e <= 0:
        se = 0.0
    else:
        se = math.sqrt(var_e / (n * (x_bar ** 2)))

    # Student-t critical value with df = n - 1
    alpha = 1.0 - confidence_level
    t_crit = float(stats.t.ppf(1.0 - alpha / 2.0, df=n - 1))
    margin_of_error = t_crit * se

    ci_low = max(0.0, p_hat_r - margin_of_error)
    ci_high = min(1.0, p_hat_r + margin_of_error)

    ci_low_pct = round(ci_low * 100.0, 3)
    ci_high_pct = round(ci_high * 100.0, 3)

    return RatioEstimatorResult(
        sampling_units_count=n,
        alive_total=alive_total,
        denominator_total=denominator_total,
        estimated_survival_pct=estimated_survival_pct,
        ci_low_pct=ci_low_pct,
        ci_high_pct=ci_high_pct,
        ci_method="STUDENT_T",
        confidence_level_pct=round(confidence_level * 100.0, 2),
    )


async def compute_and_persist_audit_result(
    session: AsyncSession,
    audit_id: uuid.UUID
) -> AuditResult:
    """
    Computes server-authoritative audit survival result and persists AuditResult.
    """
    query = (
        select(AuditSamplingUnit)
        .where(AuditSamplingUnit.audit_id == audit_id)
        .order_by(AuditSamplingUnit.sequence_no)
    )
    res = await session.execute(query)
    units = list(res.scalars().all())

    calc = calculate_survival_ratio_estimator(units)

    # Check if result already exists (idempotency check)
    existing_q = select(AuditResult).where(AuditResult.audit_id == audit_id)
    existing_res = await session.execute(existing_q)
    existing = existing_res.scalar_one_or_none()

    if existing:
        return existing

    audit_result = AuditResult(
        id=uuid.uuid4(),
        audit_id=audit_id,
        methodology_version=settings.METHODOLOGY_VERSION,
        denominator_definition="OBSERVED_OR_EXPECTED_PLANTED_SITES",
        estimator_method=calc.estimator_method,
        sampling_units_count=calc.sampling_units_count,
        alive_total=calc.alive_total,
        denominator_total=calc.denominator_total,
        estimated_survival_pct=calc.estimated_survival_pct,
        ci_low_pct=calc.ci_low_pct,
        ci_high_pct=calc.ci_high_pct,
        ci_method=calc.ci_method,
        confidence_level_pct=calc.confidence_level_pct,
        calculator_version=settings.CALCULATOR_VERSION,
    )

    session.add(audit_result)
    await session.flush()
    return audit_result
