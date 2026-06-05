import pytest

from main import app, verify_api_key


@pytest.fixture(autouse=True)
def disable_api_key_for_tests():
    # Globally override verify_api_key dependency for all tests
    app.dependency_overrides[verify_api_key] = lambda: None
    yield
    app.dependency_overrides.clear()
