import uuid
from unittest.mock import AsyncMock, patch, MagicMock
import pytest
from app.services.evidence_service import (
    compute_sha256,
    get_s3_client,
    process_and_store_evidence,
)


@pytest.fixture(autouse=True)
def mock_s3_client():
    with patch("app.services.evidence_service.get_s3_client") as mock_get_s3:
        mock_s3 = MagicMock()
        mock_get_s3.return_value = mock_s3
        yield mock_s3


def test_compute_sha256_bytes():
    data = b"Sample image binary content"
    hash_val = compute_sha256(data)
    assert len(hash_val) == 64
    assert hash_val == compute_sha256(data)


def test_get_s3_client_initialization(mock_s3_client):
    client = get_s3_client()
    assert client is not None


@pytest.mark.asyncio
async def test_process_and_store_evidence_matching_hash(mock_s3_client):
    """Happy Path: Client hash matches server computed hash exactly."""
    file_bytes = b"Authentic photo bytes from field camera"
    client_hash = compute_sha256(file_bytes)
    audit_id = uuid.uuid4()

    mock_session = AsyncMock()
    mock_session.add = MagicMock()

    evidence, hash_matches = await process_and_store_evidence(
        session=mock_session,
        audit_id=audit_id,
        file_bytes=file_bytes,
        mime_type="image/jpeg",
        evidence_type="PLOT_OVERVIEW",
        client_hash_sha256=client_hash,
        capture_lat=19.245,
        capture_lon=-99.718,
        capture_accuracy_m=5.0,
    )

    assert hash_matches is True
    assert evidence.metadata_valid is True
    assert evidence.hash_sha256 == client_hash
    assert evidence.file_size_bytes == len(file_bytes)
    assert evidence.evidence_type == "PLOT_OVERVIEW"
    assert evidence.object_key.endswith(".jpeg")
    mock_s3_client.put_object.assert_called_once()
    mock_session.add.assert_called_once_with(evidence)
    mock_session.flush.assert_called_once()


@pytest.mark.asyncio
async def test_process_and_store_evidence_tampered_hash_mismatch(mock_s3_client):
    """Edge Case: Client claims a hash that does NOT match uploaded bytes (tampering / transmission corruption)."""
    file_bytes = b"Actual image bytes"
    fake_client_hash = "0000000000000000000000000000000000000000000000000000000000000000"
    audit_id = uuid.uuid4()

    mock_session = AsyncMock()
    mock_session.add = MagicMock()

    evidence, hash_matches = await process_and_store_evidence(
        session=mock_session,
        audit_id=audit_id,
        file_bytes=file_bytes,
        mime_type="image/png",
        evidence_type="SAMPLING_UNIT",
        client_hash_sha256=fake_client_hash,
    )

    assert hash_matches is False
    assert evidence.metadata_valid is False
    assert evidence.hash_sha256 == compute_sha256(file_bytes)
    assert evidence.object_key.endswith(".png")


@pytest.mark.asyncio
async def test_process_and_store_evidence_s3_exception_fallback(mock_s3_client):
    """Edge Case: Object storage is unreachable during field or offline sync. Service must handle exception gracefully."""
    file_bytes = b"Photo bytes"
    client_hash = compute_sha256(file_bytes)
    audit_id = uuid.uuid4()

    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_s3_client.put_object.side_effect = Exception("Connection to MinIO timed out")

    evidence, hash_matches = await process_and_store_evidence(
        session=mock_session,
        audit_id=audit_id,
        file_bytes=file_bytes,
        mime_type="application/octet-stream",
        evidence_type="DETAIL",
        client_hash_sha256=client_hash,
    )

    assert hash_matches is True
    assert evidence.object_key.endswith(".octet-stream")
    mock_session.add.assert_called_once_with(evidence)
