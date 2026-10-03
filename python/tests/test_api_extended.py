import os

from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)


def test_every_endpoint_reachable():
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/regions").status_code == 200
    assert client.get("/api/dates?region=bob").status_code == 200
    assert client.get("/api/meta?region=bob&date=2024-07-15").status_code == 200
    assert client.get("/api/sources").status_code == 200
    assert client.get("/api/datasources/status").status_code == 200
    assert client.get("/api/argo?region=bob").status_code == 200
    assert client.get("/api/validation/profiles?region=bob&date=2024-07-15").status_code == 200
    assert client.post("/api/reconstruct", json={"region": "bob", "date": "2024-07-15"}).status_code == 200
    s = client.get("/api/stream/reconstruct?region=bob&date=2024-07-15")
    assert s.status_code == 200


def test_error_format_shape():
    bad = client.get("/api/dates?region=nope")
    assert bad.status_code == 422
    b = bad.json()
    assert b["code"] == "invalid_region"
    assert "message" in b
    assert b.get("ok", False) is False
    n = client.get("/api/definitely-missing")
    assert n.status_code == 404
    assert "code" in n.json()


def test_input_validation_limits():
    big = client.post("/api/reconstruct", json={"region": "bob", "date": "2024-07-15", "physics": {"lambda1": 9.0}})
    assert big.status_code == 422
    assert big.json()["code"] == "validation_error"
    bad_gap = client.post("/api/reconstruct", json={"region": "bob", "date": "2024-07-15", "gapMethod": "nope"})
    assert bad_gap.status_code == 422
    bad_data = client.post("/api/reconstruct", json={"region": "bob", "date": "2024-07-15", "dataMode": "nope"})
    assert bad_data.status_code == 422
    huge = client.post("/api/reconstruct", json={"region": "bob", "date": "2024-07-15", "uploadTensor": [1.0] * (120 * 240 + 11), "uploadShape": [120, 240]})
    assert huge.status_code == 413
    assert huge.json()["code"] == "payload_too_large"
    bad_date = client.post("/api/reconstruct", json={"region": "bob", "date": "1999-12-31"})
    assert bad_date.status_code == 422
    assert bad_date.json()["code"] == "invalid_date"


def test_stage_progress_stream_events():
    r = client.get("/api/stream/reconstruct?region=bob&date=2024-07-15")
    assert r.status_code == 200
    assert "text/event-stream" in r.headers["content-type"]
    txt = r.text
    for stage in ["ingest", "harmonize", "embed", "decode", "physics", "validate"]:
        assert stage in txt
    assert "event: done" in txt
    assert "reconVolume" in txt
    bad_engine = client.get("/api/stream/reconstruct?region=bob&date=2024-07-15&engineMode=nope")
    assert bad_engine.status_code == 422
    assert bad_engine.json()["code"] == "invalid_engine"
    bad_gap = client.get("/api/stream/reconstruct?region=bob&date=2024-07-15&gapMethod=nope")
    assert bad_gap.status_code == 422
    assert bad_gap.json()["code"] == "invalid_gap"


def test_credentials_path_names_only():
    for k in ["COPERNICUS_USERNAME", "COPERNICUS_PASSWORD", "NASA_EARTHDATA_TOKEN"]:
        os.environ.pop(k, None)
    r = client.post("/api/reconstruct", json={"region": "bob", "date": "2024-07-15", "dataMode": "live"})
    assert r.status_code == 503
    b = r.json()
    assert b["code"] == "credentials_not_configured"
    assert "COPERNICUS_USERNAME" in b["missing"]
    assert "COPERNICUS_PASSWORD" in b["missing"]
    assert "secret" not in str(b).lower() or "missing" in str(b).lower()
