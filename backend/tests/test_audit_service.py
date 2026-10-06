import pytest
from app.models.audit import AuditSamplingUnit
from app.services.audit_service import calculate_survival_ratio_estimator


def test_empty_sampling_units():
    result = calculate_survival_ratio_estimator([])
    assert result.sampling_units_count == 0
    assert result.alive_total == 0
    assert result.denominator_total == 0
    assert result.estimated_survival_pct == 0.0
    assert result.ci_low_pct is None
    assert result.ci_high_pct is None


def test_single_sampling_unit():
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
    # For n=1, no CI can be calculated
    assert result.ci_low_pct is None
    assert result.ci_high_pct is None
    assert result.ci_method == "NOT_AVAILABLE"


def test_multiple_sampling_units_ratio_estimator():
    # 3 units with variable planting sites
    # Unit 1: 80 alive, 20 dead (100 total) -> 80%
    # Unit 2: 90 alive, 10 dead (100 total) -> 90%
    # Unit 3: 70 alive, 30 dead (100 total) -> 70%
    # Total alive: 240, Total denominator: 300 -> Ratio: 240/300 = 80.0%
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
    # Demonstrates that Ratio Estimator avoids unweighted average distortion:
    # Unit 1 (small sample): 10 alive, 0 dead (100% survival)
    # Unit 2 (large sample): 40 alive, 60 dead (40% survival)
    # Total alive: 50, Total: 110. Ratio = 50 / 110 = 45.45%
    # (Unweighted mean would be (100% + 40%) / 2 = 70%, which is heavily biased!)
    units = [
        AuditSamplingUnit(alive_trees=10, dead_trees=0, sampled_planting_sites=10),
        AuditSamplingUnit(alive_trees=40, dead_trees=60, sampled_planting_sites=100),
    ]
    result = calculate_survival_ratio_estimator(units)
    assert result.sampling_units_count == 2
    assert result.alive_total == 50
    assert result.denominator_total == 110
    assert result.estimated_survival_pct == pytest.approx(45.455, abs=0.01)
