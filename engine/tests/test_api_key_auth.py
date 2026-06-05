import pytest
from fastapi.testclient import TestClient

from main import app, verify_api_key


@pytest.fixture
def client_with_auth():
    # Remove override for authentication tests
    if verify_api_key in app.dependency_overrides:
        del app.dependency_overrides[verify_api_key]
    yield TestClient(app)
    # Restore override after tests
    app.dependency_overrides[verify_api_key] = lambda: None


def test_api_key_unauthorized(client_with_auth):
    # No header -> 401
    response = client_with_auth.post("/validate_pipeline", json={})
    assert response.status_code == 401
    assert "Invalid or missing X-API-Key header." in response.json()["detail"]

    # Invalid header value -> 401
    response = client_with_auth.post(
        "/validate_pipeline", headers={"X-API-Key": "wrong-key"}, json={}
    )
    assert response.status_code == 401


def test_api_key_public_endpoints_allowed(client_with_auth):
    # Public endpoints like /health should be accessible without headers
    response = client_with_auth.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_api_key_authorized_success(client_with_auth):
    # Try with valid default header value. Expecting 422 (validation error)
    # instead of 401 since request body is empty but authentication passes.
    response = client_with_auth.post(
        "/validate_pipeline", headers={"X-API-Key": "weave-default-key-12345"}, json={}
    )
    assert response.status_code == 422
