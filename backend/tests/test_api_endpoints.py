import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.api.v1.auth import get_current_user
from app.models.user import User


@pytest.fixture
def mock_current_user():
    return User(
        id=uuid.uuid4(),
        username="admin_test",
        display_name="Admin Test",
        role="ADMIN",
        active=True,
    )


@pytest.mark.asyncio
async def test_health_check():
    """Happy Path: Public health check endpoint returns 200 and methodology version."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["methodology_version"] == "SAMPLING-1.0"


@pytest.mark.asyncio
async def test_unauthenticated_endpoints_return_401():
    """Security Edge Case: Protected routes without Bearer token must return 401 Unauthorized."""
    # Ensure no dependency override for this test
    app.dependency_overrides.pop(get_current_user, None)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Sync challenges
        res_chal = await client.post("/api/v1/sync/challenges", json={"device_installation_id": str(uuid.uuid4())})
        assert res_chal.status_code == 401

        # Sync audits
        res_audit = await client.post("/api/v1/sync/audits", json={})
        assert res_audit.status_code == 401

        # Decisions
        res_dec = await client.post("/api/v1/decisions/evaluate", json={})
        assert res_dec.status_code == 401

        # Plots
        res_plot = await client.get(f"/api/v1/plots/{uuid.uuid4()}")
        assert res_plot.status_code == 401


@pytest.mark.asyncio
async def test_auth_token_missing_credentials_422():
    """Edge Case: Missing username or password returns 422 Unprocessable Entity."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/auth/token", data={})
        assert response.status_code == 422


@pytest.mark.asyncio
async def test_sync_challenge_validation_error_with_auth(mock_current_user):
    """Edge Case: Authenticated user submitting malformed non-UUID device_installation_id returns 422."""
    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            headers = {"Authorization": "Bearer mock-test-token"}
            response = await client.post(
                "/api/v1/sync/challenges",
                json={"device_installation_id": "not-a-uuid"},
                headers=headers,
            )
            assert response.status_code == 422
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_sync_audit_negative_trees_validation_error_with_auth(mock_current_user):
    """Edge Case: Authenticated audit submission with negative tree count returns 422."""
    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "plot_id": str(uuid.uuid4()),
                "technician_id": str(uuid.uuid4()),
                "device_installation_id": str(uuid.uuid4()),
                "methodology_version": "SAMPLING-1.0",
                "survey_started_at": "2026-10-09T10:00:00Z",
                "client_created_at": "2026-10-09T10:00:00Z",
                "idempotency_key": "test-key-negative",
                "sampling_units": [
                    {
                        "sequence_no": 1,
                        "lat": 19.245,
                        "lon": -99.718,
                        "radius_m": 12.616,
                        "alive_trees": -5,  # Invalid negative count
                        "dead_trees": 10,
                        "captured_at": "2026-10-09T10:00:00Z",
                    }
                ],
            }
            headers = {"Authorization": "Bearer mock-test-token"}
            response = await client.post("/api/v1/sync/audits", json=payload, headers=headers)
            assert response.status_code == 422
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_decision_evaluate_invalid_policy_validation_error_with_auth(mock_current_user):
    """Edge Case: Authenticated decision evaluation with invalid override_decision returns 422."""
    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "plot_id": str(uuid.uuid4()),
                "audit_id": str(uuid.uuid4()),
                "override_decision": "INVALID_DECISION_ENUM",
            }
            headers = {"Authorization": "Bearer mock-test-token"}
            response = await client.post("/api/v1/decisions/evaluate", json=payload, headers=headers)
            assert response.status_code == 422
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_plot_get_invalid_uuid_returns_422_with_auth(mock_current_user):
    """Edge Case: Authenticated fetch of plot with non-UUID path parameter returns 422."""
    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            headers = {"Authorization": "Bearer mock-test-token"}
            response = await client.get("/api/v1/plots/invalid-uuid-string", headers=headers)
            assert response.status_code == 422
    finally:
        app.dependency_overrides.pop(get_current_user, None)
