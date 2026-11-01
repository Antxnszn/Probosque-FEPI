import math
import uuid
from unittest.mock import AsyncMock, MagicMock
import pytest
from app.models.audit import AuditSamplingUnit, AuditResult
from app.services.audit_service import (
    calculate_survival_ratio_estimator,
    compute_and_persist_audit_result,
    RatioEstimatorResult,
)


def test_empty_sampling_units():
    """Edge Case: n=0 sampling units returns 0% with no CI."""
    result = calculate_survival_ratio_estimator([])
    assert result.sampling_units_count == 0
    assert result.alive_total == 0
    assert result.denominator_total == 0
    assert result.estimated_survival_pct == 0.0
    assert result.ci_low_pct is None
    assert result.ci_high_pct is None
    assert result.ci_method is None


def test_single_sampling_unit():
    """Edge Case: n=1 unit. Ratio estimator can compute point estimate, but Student-t requires df = n-1 >= 1."""
    unit = AuditSamplingUnit(
        alive_trees=85,
        dead_trees=15,
        sampled_planting_sites=100,
    )
    result = calculate_survival_ratio_estimator([unit])
    assert result.sampling_units_count == 1
    assert result.alive_total == 85
    assert result.denominator_total == 100
    assert result.estimated_survival_pct == 85.0
    assert result.ci_low_pct is None
    assert result.ci_high_pct is None
    assert result.ci_method == "NOT_AVAILABLE"


def test_zero_total_denominator_edge_case():
    """Edge Case: All units report 0 alive and 0 dead trees (denominator is 0). Must not raise ZeroDivisionError."""
    units = [
        AuditSamplingUnit(alive_trees=0, dead_trees=0, sampled_planting_sites=0),
        AuditSamplingUnit(alive_trees=0, dead_trees=0, sampled_planting_sites=0),
    ]
    result = calculate_survival_ratio_estimator(units)
    assert result.sampling_units_count == 2
    assert result.alive_total == 0
    assert result.denominator_total == 0
    assert result.estimated_survival_pct == 0.0
    assert result.ci_low_pct is None
    assert result.ci_high_pct is None
    assert result.ci_method == "NOT_AVAILABLE"


def test_perfect_100_percent_survival_variance_zero():
    """Edge Case: 100% survival across all sampling units. Residuals are identically zero, SE=0.0."""
    units = [
        AuditSamplingUnit(alive_trees=50, dead_trees=0, sampled_planting_sites=50),
        AuditSamplingUnit(alive_trees=80, dead_trees=0, sampled_planting_sites=80),
        AuditSamplingUnit(alive_trees=100, dead_trees=0, sampled_planting_sites=100),
    ]
    result = calculate_survival_ratio_estimator(units)
    assert result.sampling_units_count == 3
    assert result.alive_total == 230
    assert result.denominator_total == 230
    assert result.estimated_survival_pct == 100.0
    assert result.ci_low_pct == 100.0
    assert result.ci_high_pct == 100.0
    assert result.ci_method == "STUDENT_T"


def test_zero_percent_survival_all_dead():
    """Edge Case: 0% survival across all sampling units. SE=0.0, both bounds 0.0%."""
    units = [
        AuditSamplingUnit(alive_trees=0, dead_trees=50, sampled_planting_sites=50),
        AuditSamplingUnit(alive_trees=0, dead_trees=70, sampled_planting_sites=70),
    ]
    result = calculate_survival_ratio_estimator(units)
    assert result.sampling_units_count == 2
    assert result.alive_total == 0
    assert result.denominator_total == 120
    assert result.estimated_survival_pct == 0.0
    assert result.ci_low_pct == 0.0
    assert result.ci_high_pct == 0.0


def test_ci_clamping_at_bounds():
    """Edge Case: High residual variance with small n (n=2, t_crit=12.7) where CI would mathematically exceed [0, 100%]."""
    # Unit 1: 95% survival (95/100)
    # Unit 2: 5% survival (5/100)
    # Large variance with df=1 produces very wide CI. Clamping at 0.0% and 100.0% must hold.
    units = [
        AuditSamplingUnit(alive_trees=95, dead_trees=5, sampled_planting_sites=100),
        AuditSamplingUnit(alive_trees=5, dead_trees=95, sampled_planting_sites=100),
    ]
    result = calculate_survival_ratio_estimator(units)
    assert result.sampling_units_count == 2
    assert result.estimated_survival_pct == 50.0
    assert result.ci_low_pct == 0.0
    assert result.ci_high_pct == 100.0


def test_fallback_to_alive_plus_dead_when_sampled_sites_missing():
    """Edge Case: sampled_planting_sites is None or 0. Denominator must fall back to alive_trees + dead_trees."""
    units = [
        AuditSamplingUnit(alive_trees=40, dead_trees=10, sampled_planting_sites=None),
        AuditSamplingUnit(alive_trees=30, dead_trees=20, sampled_planting_sites=0),
    ]
    result = calculate_survival_ratio_estimator(units)
    assert result.sampling_units_count == 2
    # Unit 1: 40 + 10 = 50. Unit 2: 30 + 20 = 50. Total: 100.
    assert result.denominator_total == 100
    assert result.alive_total == 70
    assert result.estimated_survival_pct == 70.0


def test_multiple_sampling_units_ratio_estimator():
    """Happy Path: 3 units with variable planting sites."""
    units = [
        AuditSamplingUnit(alive_trees=80, dead_trees=20, sampled_planting_sites=100),
        AuditSamplingUnit(alive_trees=90, dead_trees=10, sampled_planting_sites=100),
        AuditSamplingUnit(alive_trees=70, dead_trees=30, sampled_planting_sites=100),
    ]
    result = calculate_survival_ratio_estimator(units, confidence_level=0.95)
    assert result.sampling_units_count == 3
    assert result.alive_total == 240
    assert result.denominator_total == 300
    assert result.estimated_survival_pct == 80.0
    assert result.ci_method == "STUDENT_T"
    assert result.confidence_level_pct == 95.0
    assert result.ci_low_pct is not None
    assert result.ci_high_pct is not None
    assert result.ci_low_pct < 80.0 < result.ci_high_pct
    assert 0.0 <= result.ci_low_pct <= 100.0
    assert 0.0 <= result.ci_high_pct <= 100.0


def test_unequal_weights_ratio_estimator():
    """Edge Case: Unequal weights avoid unweighted arithmetic average distortion."""
    units = [
        AuditSamplingUnit(alive_trees=10, dead_trees=0, sampled_planting_sites=10),
        AuditSamplingUnit(alive_trees=40, dead_trees=60, sampled_planting_sites=100),
    ]
    result = calculate_survival_ratio_estimator(units)
    assert result.sampling_units_count == 2
    assert result.alive_total == 50
    assert result.denominator_total == 110
    assert result.estimated_survival_pct == pytest.approx(45.455, abs=0.01)


def test_confidence_level_variations():
    """Edge Case: Comparing 90%, 95%, and 99% confidence intervals on identical units."""
    units = [
        AuditSamplingUnit(alive_trees=82, dead_trees=18, sampled_planting_sites=100),
        AuditSamplingUnit(alive_trees=78, dead_trees=22, sampled_planting_sites=100),
        AuditSamplingUnit(alive_trees=85, dead_trees=15, sampled_planting_sites=100),
        AuditSamplingUnit(alive_trees=75, dead_trees=25, sampled_planting_sites=100),
    ]
    res_90 = calculate_survival_ratio_estimator(units, confidence_level=0.90)
    res_95 = calculate_survival_ratio_estimator(units, confidence_level=0.95)
    res_99 = calculate_survival_ratio_estimator(units, confidence_level=0.99)

    width_90 = res_90.ci_high_pct - res_90.ci_low_pct
    width_95 = res_95.ci_high_pct - res_95.ci_low_pct
    width_99 = res_99.ci_high_pct - res_99.ci_low_pct

    # As confidence level increases, the confidence interval MUST strictly widen
    assert width_90 < width_95 < width_99


@pytest.mark.asyncio
async def test_compute_and_persist_audit_result_service():
    """Test compute_and_persist_audit_result with database session."""
    audit_id = uuid.uuid4()
    mock_units = [
        AuditSamplingUnit(id=uuid.uuid4(), audit_id=audit_id, sequence_no=1, alive_trees=80, dead_trees=20, sampled_planting_sites=100),
        AuditSamplingUnit(id=uuid.uuid4(), audit_id=audit_id, sequence_no=2, alive_trees=85, dead_trees=15, sampled_planting_sites=100),
    ]

    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_execute_res = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = mock_units
    mock_execute_res.scalars.return_value = mock_scalars
    mock_execute_res.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_execute_res

    res = await compute_and_persist_audit_result(mock_session, audit_id)
    assert res.audit_id == audit_id
    assert res.sampling_units_count == 2
    assert res.alive_total == 165
    assert res.denominator_total == 200
    assert res.estimated_survival_pct == 82.5
    assert res.ci_method == "STUDENT_T"
    mock_session.add.assert_called_once_with(res)
    mock_session.flush.assert_called_once()


@pytest.mark.asyncio
async def test_compute_and_persist_idempotency_returns_existing():
    """Edge Case: Calling compute_and_persist when an AuditResult already exists returns it immediately without re-adding."""
    audit_id = uuid.uuid4()
    mock_units = [
        AuditSamplingUnit(
            id=uuid.uuid4(),
            audit_id=audit_id,
            sequence_no=1,
            alive_trees=80,
            dead_trees=20,
            sampled_planting_sites=100,
        )
    ]
    existing_result = AuditResult(
        id=uuid.uuid4(),
        audit_id=audit_id,
        methodology_version="SAMPLING-1.0",
        denominator_definition="OBSERVED_OR_EXPECTED_PLANTED_SITES",
        estimator_method="RATIO_ESTIMATOR",
        sampling_units_count=1,
        alive_total=80,
        denominator_total=100,
        estimated_survival_pct=80.0,
        ci_low_pct=80.0,
        ci_high_pct=80.0,
        confidence_level_pct=95.0,
        ci_method="STUDENT_T",
        calculator_version="CALC-1.0",
    )

    mock_session = AsyncMock()
    mock_session.add = MagicMock()

    mock_execute_res = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = mock_units
    mock_execute_res.scalars.return_value = mock_scalars
    mock_execute_res.scalar_one_or_none.return_value = existing_result
    mock_session.execute.return_value = mock_execute_res

    res = await compute_and_persist_audit_result(mock_session, audit_id)

    assert res == existing_result
    mock_session.add.assert_not_called()


