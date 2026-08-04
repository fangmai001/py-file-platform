from app.core.config import Settings, settings


def test_health_reports_the_build_version(client, monkeypatch):
    """Offline hosts verify which release is running with this one request."""
    monkeypatch.setattr(settings, "app_build_version", "v9.9.9")

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "v9.9.9"}


def test_version_defaults_to_dev_outside_a_built_image():
    """Only the Dockerfile sets APP_BUILD_VERSION, so native dev must not claim a release."""
    assert Settings.model_fields["app_build_version"].default == "dev"
