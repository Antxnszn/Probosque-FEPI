import uuid
from unittest.mock import AsyncMock, MagicMock
import pytest
from app.models.audit import Audit, AuditResult
from app.models.plot import Plot
from app.models.evidence import EvidencePhoto
from app.models.subsidy import SubsidyDecision
from app.services.decision_service import evaluate_subsidy_decision


def create_mock_session(audit=None, audit_result=None, photos=None, plot=None):
    session = AsyncMock()
    session.add = MagicMock()

    def mock_execute(query):
        mock_result = MagicMock()
        query_str = str(query).lower()

        if "from audits" in query_str or "audit.id" in query_str:
            mock_result.scalar_one_or_none.return_value = audit
        elif "from audit_results" in query_str or "audit_result" in query_str:
            mock_result.scalar_one_or_none.return_value = audit_result
        elif "from evidence_photos" in query_str or "evidence_photo" in query_str:
            mock_scalars = MagicMock()
            mock_scalars.all.return_value = photos or []
            mock_result.scalars.return_value = mock_scalars
        elif "from plots" in query_str or "plot.id" in query_str:
            mock_result.scalar_one_or_none.return_value = plot
        else:
            mock_result.scalar_one_or_none.return_value = None

        return mock_result

    session.execute.side_effect = mock_execute
    return session


@pytest.mark.asyncio
async def test_evaluate_subsidy_happy_path_approved():
    """Happy Path: >=80% survival, valid geofence, overview photo present, n >= 2 units -> APPROVED."""
    audit_id = uuid.uuid4()
    plot_id = uuid.uuid4()

    mock_audit = Audit(id=audit_id, plot_id=plot_id, geofence_valid=True)
    mock_result = AuditResult(
        id=uuid.uuid4(),
        audit_id=audit_id,
        estimated_survival_pct=85.0,
        ci_low_pct=81.2,
        ci_high_pct=88.8,
        sampling_units_count=5,
        alive_total=240,
        denominator_total=282,
    )
    mock_photos = [
        EvidencePhoto(id=uuid.uuid4(), audit_id=audit_id, evidence_type="PLOT_OVERVIEW"),
        EvidencePhoto(id=uuid.uuid4(), audit_id=audit_id, evidence_type="SAMPLING_UNIT"),
    ]
    mock_plot = Plot(id=plot_id, subsidy_status="PENDING")

    session = create_mock_session(mock_audit, mock_result, mock_photos, mock_plot)

    decision = await evaluate_subsidy_decision(session, plot_id, audit_id)

    assert decision.decision == "APPROVED"
    assert decision.reason_codes == []
    assert decision.decision_basis["estimated_survival_pct"] == 85.0
    assert decision.decision_basis["has_overview_photo"] is True
    assert mock_plot.subsidy_status == "APPROVED"
    session.add.assert_called_once()
    session.flush.assert_called_once()


@pytest.mark.asyncio
async def test_evaluate_subsidy_exact_threshold_boundary():
    """Edge Case: Point estimate is exactly 80.00% (the threshold boundary). Must be APPROVED."""
    audit_id = uuid.uuid4()
    plot_id = uuid.uuid4()

    mock_audit = Audit(id=audit_id, plot_id=plot_id, geofence_valid=True)
    mock_result = AuditResult(
        id=uuid.uuid4(),
        audit_id=audit_id,
        estimated_survival_pct=80.0,
        ci_low_pct=76.0,
        ci_high_pct=84.0,
        sampling_units_count=4,
        alive_total=200,
        denominator_total=250,
    )
    mock_photos = [EvidencePhoto(id=uuid.uuid4(), audit_id=audit_id, evidence_type="PLOT_OVERVIEW")]
    mock_plot = Plot(id=plot_id, subsidy_status="PENDING")

    session = create_mock_session(mock_audit, mock_result, mock_photos, mock_plot)

    decision = await evaluate_subsidy_decision(session, plot_id, audit_id, survival_threshold_pct=80.0)
    assert decision.decision == "APPROVED"
    assert "SURVIVAL_BELOW_THRESHOLD" not in decision.reason_codes


@pytest.mark.asyncio
async def test_evaluate_subsidy_below_threshold_rejected():
    """Edge Case: Point estimate is strictly below threshold (79.9% < 80.0%) -> REJECTED."""
    audit_id = uuid.uuid4()
    plot_id = uuid.uuid4()

    mock_audit = Audit(id=audit_id, plot_id=plot_id, geofence_valid=True)
    mock_result = AuditResult(
        id=uuid.uuid4(),
        audit_id=audit_id,
        estimated_survival_pct=79.9,
        ci_low_pct=75.0,
        ci_high_pct=84.0,
        sampling_units_count=4,
        alive_total=199,
        denominator_total=250,
    )
    mock_photos = [EvidencePhoto(id=uuid.uuid4(), audit_id=audit_id, evidence_type="PLOT_OVERVIEW")]
    mock_plot = Plot(id=plot_id, subsidy_status="PENDING")

    session = create_mock_session(mock_audit, mock_result, mock_photos, mock_plot)

    decision = await evaluate_subsidy_decision(session, plot_id, audit_id, survival_threshold_pct=80.0)
    assert decision.decision == "REJECTED"
    assert "SURVIVAL_BELOW_THRESHOLD" in decision.reason_codes
    assert mock_plot.subsidy_status == "REJECTED"


@pytest.mark.asyncio
async def test_evaluate_subsidy_geofence_invalid_triggers_manual_review():
    """Edge Case: Survival is 95%, but geofence is invalid -> MANUAL_REVIEW, not automatic approval."""
    audit_id = uuid.uuid4()
    plot_id = uuid.uuid4()

    mock_audit = Audit(id=audit_id, plot_id=plot_id, geofence_valid=False)
    mock_result = AuditResult(
        id=uuid.uuid4(),
        audit_id=audit_id,
        estimated_survival_pct=95.0,
        ci_low_pct=91.0,
        ci_high_pct=99.0,
        sampling_units_count=5,
        alive_total=285,
        denominator_total=300,
    )
    mock_photos = [EvidencePhoto(id=uuid.uuid4(), audit_id=audit_id, evidence_type="PLOT_OVERVIEW")]
    mock_plot = Plot(id=plot_id, subsidy_status="PENDING")

    session = create_mock_session(mock_audit, mock_result, mock_photos, mock_plot)

    decision = await evaluate_subsidy_decision(session, plot_id, audit_id)
    assert decision.decision == "MANUAL_REVIEW"
    assert "GEOFENCE_INVALID" in decision.reason_codes
    assert mock_plot.subsidy_status == "MANUAL_REVIEW"


@pytest.mark.asyncio
async def test_evaluate_subsidy_missing_overview_photo():
    """Edge Case: High survival and valid geofence, but missing PLOT_OVERVIEW photo -> MANUAL_REVIEW."""
    audit_id = uuid.uuid4()
    plot_id = uuid.uuid4()

    mock_audit = Audit(id=audit_id, plot_id=plot_id, geofence_valid=True)
    mock_result = AuditResult(
        id=uuid.uuid4(),
        audit_id=audit_id,
        estimated_survival_pct=88.0,
        ci_low_pct=84.0,
        ci_high_pct=92.0,
        sampling_units_count=3,
        alive_total=176,
        denominator_total=200,
    )
    # Only detail photos, no PLOT_OVERVIEW
    mock_photos = [EvidencePhoto(id=uuid.uuid4(), audit_id=audit_id, evidence_type="DETAIL")]
    mock_plot = Plot(id=plot_id, subsidy_status="PENDING")

    session = create_mock_session(mock_audit, mock_result, mock_photos, mock_plot)

    decision = await evaluate_subsidy_decision(session, plot_id, audit_id)
    assert decision.decision == "MANUAL_REVIEW"
    assert "MISSING_OVERVIEW_PHOTO" in decision.reason_codes


@pytest.mark.asyncio
async def test_evaluate_subsidy_insufficient_sampling_units():
    """Edge Case: Only n=1 sampling unit registered -> MANUAL_REVIEW."""
    audit_id = uuid.uuid4()
    plot_id = uuid.uuid4()

    mock_audit = Audit(id=audit_id, plot_id=plot_id, geofence_valid=True)
    mock_result = AuditResult(
        id=uuid.uuid4(),
        audit_id=audit_id,
        estimated_survival_pct=90.0,
        ci_low_pct=None,
        ci_high_pct=None,
        sampling_units_count=1,
        alive_total=90,
        denominator_total=100,
    )
    mock_photos = [EvidencePhoto(id=uuid.uuid4(), audit_id=audit_id, evidence_type="PLOT_OVERVIEW")]
    mock_plot = Plot(id=plot_id, subsidy_status="PENDING")

    session = create_mock_session(mock_audit, mock_result, mock_photos, mock_plot)

    decision = await evaluate_subsidy_decision(session, plot_id, audit_id)
    assert decision.decision == "MANUAL_REVIEW"
    assert "INSUFFICIENT_SAMPLING_UNITS" in decision.reason_codes


@pytest.mark.asyncio
async def test_evaluate_subsidy_multiple_simultaneous_defects():
    """Edge Case: Collects all reason codes when geofence invalid, missing photo, n<2 and low survival."""
    audit_id = uuid.uuid4()
    plot_id = uuid.uuid4()

    mock_audit = Audit(id=audit_id, plot_id=plot_id, geofence_valid=False)
    mock_result = AuditResult(
        id=uuid.uuid4(),
        audit_id=audit_id,
        estimated_survival_pct=50.0,
        ci_low_pct=None,
        ci_high_pct=None,
        sampling_units_count=1,
        alive_total=50,
        denominator_total=100,
    )
    mock_photos = []
    mock_plot = Plot(id=plot_id, subsidy_status="PENDING")

    session = create_mock_session(mock_audit, mock_result, mock_photos, mock_plot)

    decision = await evaluate_subsidy_decision(session, plot_id, audit_id)
    assert decision.decision == "MANUAL_REVIEW"
    assert "SURVIVAL_BELOW_THRESHOLD" in decision.reason_codes
    assert "GEOFENCE_INVALID" in decision.reason_codes
    assert "MISSING_OVERVIEW_PHOTO" in decision.reason_codes
    assert "INSUFFICIENT_SAMPLING_UNITS" in decision.reason_codes


@pytest.mark.asyncio
async def test_evaluate_subsidy_conservative_ci_lower_policy():
    """Edge Case: Point estimate is 83% (>=80%), but CI lower bound is 76% (<80%). Under conservative policy -> REJECTED."""
    audit_id = uuid.uuid4()
    plot_id = uuid.uuid4()

    mock_audit = Audit(id=audit_id, plot_id=plot_id, geofence_valid=True)
    mock_result = AuditResult(
        id=uuid.uuid4(),
        audit_id=audit_id,
        estimated_survival_pct=83.0,
        ci_low_pct=76.5,
        ci_high_pct=89.5,
        sampling_units_count=3,
        alive_total=166,
        denominator_total=200,
    )
    mock_photos = [EvidencePhoto(id=uuid.uuid4(), audit_id=audit_id, evidence_type="PLOT_OVERVIEW")]
    mock_plot = Plot(id=plot_id, subsidy_status="PENDING")

    session = create_mock_session(mock_audit, mock_result, mock_photos, mock_plot)

    # 1. Conservative policy evaluates lower CI bound
    decision_conservative = await evaluate_subsidy_decision(
        session, plot_id, audit_id, ci_policy="CONSERVATIVE_CI_LOWER"
    )
    assert decision_conservative.decision == "REJECTED"
    assert "SURVIVAL_BELOW_THRESHOLD" in decision_conservative.reason_codes

    # 2. Point estimate policy evaluates 83% directly -> APPROVED
    decision_point = await evaluate_subsidy_decision(
        session, plot_id, audit_id, ci_policy="POINT_ESTIMATE"
    )
    assert decision_point.decision == "APPROVED"


@pytest.mark.asyncio
async def test_evaluate_subsidy_administrative_override():
    """Edge Case: Supervisor overrides an automated rejection with formal justification."""
    audit_id = uuid.uuid4()
    plot_id = uuid.uuid4()

    mock_audit = Audit(id=audit_id, plot_id=plot_id, geofence_valid=True)
    mock_result = AuditResult(
        id=uuid.uuid4(),
        audit_id=audit_id,
        estimated_survival_pct=72.0,
        ci_low_pct=65.0,
        ci_high_pct=79.0,
        sampling_units_count=4,
        alive_total=144,
        denominator_total=200,
    )
    mock_photos = [EvidencePhoto(id=uuid.uuid4(), audit_id=audit_id, evidence_type="PLOT_OVERVIEW")]
    mock_plot = Plot(id=plot_id, subsidy_status="PENDING")

    session = create_mock_session(mock_audit, mock_result, mock_photos, mock_plot)

    decision = await evaluate_subsidy_decision(
        session,
        plot_id,
        audit_id,
        override_decision="APPROVED",
        override_reason="Decreto de emergencia por helada atípica en Zinacantepec",
    )
    assert decision.decision == "APPROVED"
    assert any("OVERRIDE: Decreto de emergencia" in code for code in decision.reason_codes)
    assert mock_plot.subsidy_status == "APPROVED"


@pytest.mark.asyncio
async def test_evaluate_subsidy_missing_audit_raises_value_error():
    """Error Case: Non-existent audit ID raises ValueError."""
    session = create_mock_session(audit=None)
    with pytest.raises(ValueError, match="Audit .* not found"):
        await evaluate_subsidy_decision(session, uuid.uuid4(), uuid.uuid4())


@pytest.mark.asyncio
async def test_evaluate_subsidy_missing_result_raises_value_error():
    """Error Case: Audit exists but result has not been computed yet raises ValueError."""
    audit_id = uuid.uuid4()
    mock_audit = Audit(id=audit_id, plot_id=uuid.uuid4())
    session = create_mock_session(audit=mock_audit, audit_result=None)
    with pytest.raises(ValueError, match="AuditResult not found"):
        await evaluate_subsidy_decision(session, uuid.uuid4(), audit_id)
