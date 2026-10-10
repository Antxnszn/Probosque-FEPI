import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from app.models.sync import SyncChallenge, SyncLog
from app.models.audit import Audit
from app.models.plot import Plot
from app.schemas.audit import AuditCreate, SamplingUnitCreate
from app.services.sync_service import (
    create_challenge,
    verify_and_consume_challenge,
    ingest_audit_idempotent,
)


@pytest.mark.asyncio
async def test_create_challenge():
    """Happy Path: Generates a SyncChallenge with 32-byte nonce and 300s TTL."""
    device_id = uuid.uuid4()
    mock_session = AsyncMock()
    mock_session.add = MagicMock()

    challenge = await create_challenge(mock_session, device_id, ttl_seconds=300)

    assert challenge.device_installation_id == device_id
    assert len(challenge.nonce) == 64  # 32 bytes in hex
    assert challenge.consumed_at is None
    assert challenge.expires_at > challenge.issued_at
    mock_session.add.assert_called_once_with(challenge)
    mock_session.flush.assert_called_once()


@pytest.mark.asyncio
async def test_verify_and_consume_challenge_valid():
    """Happy Path: Unconsumed, unexpired challenge is verified and consumed."""
    challenge_id = uuid.uuid4()
    device_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    mock_challenge = SyncChallenge(
        id=challenge_id,
        device_installation_id=device_id,
        nonce="abcd" * 16,
        issued_at=now,
        expires_at=now + timedelta(seconds=120),
        consumed_at=None,
    )

    mock_session = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = mock_challenge
    mock_session.execute.return_value = mock_res

    consumed = await verify_and_consume_challenge(mock_session, challenge_id, device_id)
    assert consumed is True
    assert mock_challenge.consumed_at is not None


@pytest.mark.asyncio
async def test_verify_and_consume_challenge_replay_attack():
    """Edge Case: Replay attack - attempting to verify an already consumed challenge returns False."""
    challenge_id = uuid.uuid4()
    device_id = uuid.uuid4()

    mock_session = AsyncMock()
    mock_res = MagicMock()
    # Query filters on consumed_at.is_(None), so already consumed returns None
    mock_res.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_res

    consumed = await verify_and_consume_challenge(mock_session, challenge_id, device_id)
    assert consumed is False


@pytest.mark.asyncio
async def test_verify_and_consume_challenge_expired():
    """Edge Case: Challenge has expired past its TTL returns False."""
    challenge_id = uuid.uuid4()
    device_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    # Expired 10 seconds ago
    mock_challenge = SyncChallenge(
        id=challenge_id,
        device_installation_id=device_id,
        nonce="abcd" * 16,
        issued_at=now - timedelta(seconds=200),
        expires_at=now - timedelta(seconds=10),
        consumed_at=None,
    )

    mock_session = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = mock_challenge
    mock_session.execute.return_value = mock_res

    consumed = await verify_and_consume_challenge(mock_session, challenge_id, device_id)
    assert consumed is False
    assert mock_challenge.consumed_at is None


@pytest.mark.asyncio
async def test_ingest_audit_idempotent_existing_sync_log():
    """Edge Case: Audit already ingested with the same idempotency_key returns existing audit without duplicating."""
    idempotency_key = "idemp-audit-abc-123"
    existing_audit_id = uuid.uuid4()
    mock_audit = Audit(id=existing_audit_id)

    mock_sync_log = SyncLog(
        id=uuid.uuid4(),
        idempotency_key=idempotency_key,
        server_reference=existing_audit_id,
    )

    mock_session = AsyncMock()
    mock_session.add = MagicMock()

    def mock_exec(query):
        res = MagicMock()
        q_str = str(query).lower()
        if "sync_log" in q_str:
            res.scalar_one_or_none.return_value = mock_sync_log
        elif "audit" in q_str:
            res.scalar_one_or_none.return_value = mock_audit
        else:
            res.scalar_one_or_none.return_value = None
        return res

    mock_session.execute.side_effect = mock_exec

    payload = AuditCreate(
        id=existing_audit_id,
        plot_id=uuid.uuid4(),
        technician_id=uuid.uuid4(),
        device_installation_id=uuid.uuid4(),
        methodology_version="SAMPLING-1.0",
        survey_started_at=datetime.now(timezone.utc),
        client_created_at=datetime.now(timezone.utc),
        idempotency_key=idempotency_key,
        sampling_units=[],
    )

    audit, is_new = await ingest_audit_idempotent(mock_session, payload)
    assert audit.id == existing_audit_id
    assert is_new is False
    # No new audit added
    mock_session.add.assert_not_called()


@pytest.mark.asyncio
async def test_ingest_audit_idempotent_new_audit_geofence_bypass():
    """Happy Path + Edge Case: New audit without coordinates gracefully bypasses geofencing and computes results."""
    audit_id = uuid.uuid4()
    plot_id = uuid.uuid4()
    idempotency_key = "idemp-new-audit-xyz"

    mock_session = AsyncMock()
    mock_session.add = MagicMock()

    def mock_exec(query):
        res = MagicMock()
        res.scalar_one_or_none.return_value = None
        return res

    mock_session.execute.side_effect = mock_exec

    payload = AuditCreate(
        id=audit_id,
        plot_id=plot_id,
        technician_id=uuid.uuid4(),
        device_installation_id=uuid.uuid4(),
        methodology_version="SAMPLING-1.0",
        survey_started_at=datetime.now(timezone.utc),
        client_created_at=datetime.now(timezone.utc),
        start_lat=None,  # No coordinates -> BYPASS
        start_lon=None,
        idempotency_key=idempotency_key,
        sampling_units=[
            SamplingUnitCreate(
                sequence_no=1,
                lat=19.245,
                lon=-99.718,
                radius_m=12.616,
                area_m2=500.0,
                alive_trees=85,
                dead_trees=15,
                sampled_planting_sites=100,
                captured_at=datetime.now(timezone.utc),
            )
        ],
    )

    with patch("app.services.sync_service.compute_and_persist_audit_result") as mock_compute:
        audit, is_new = await ingest_audit_idempotent(mock_session, payload)

        assert is_new is True
        assert audit.id == audit_id
        assert audit.geofence_method == "BYPASS"
        assert audit.geofence_valid is True
        mock_compute.assert_called_once_with(mock_session, audit_id)
