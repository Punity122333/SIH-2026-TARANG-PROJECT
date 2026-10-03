import os

from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)
REQUIRED_KEYS = ["rmse", "bias", "r2", "thermoErr", "uohc", "mse", "lStab", "lThermal", "total", "missingPct", "surfaceTemp", "thermoDepth"]
def test_health_shape():
    r = client.get("/api/health")
    assert r.status_code == 200
    b = r.json()
    assert b["ok"] is True
    assert b["version"] == "0.1.0"
    assert isinstance(b["engines"], list) and len(b["engines"]) >= 4
    assert isinstance(b["liveConfigured"], bool)
    assert isinstance(b["missingVars"], list)
def test_regions():
    r = client.get("/api/regions")
    assert r.status_code == 200
    b = r.json()
    ids = [x["id"] for x in b]
    assert "bob" in ids and "arabian" in ids
    for x in b:
        assert "latMin" in x and "lonMax" in x
def test_dates():
    r = client.get("/api/dates?region=bob")
    assert r.status_code == 200
    b = r.json()
    assert b["region"] == "bob"
    assert "2024-07-15" in b["dates"]
    bad = client.get("/api/dates?region=xx")
    assert bad.status_code == 422
    assert bad.json()["code"] == "invalid_region"
def test_meta_sources_argo():
    assert client.get("/api/meta?region=bob&date=2024-07-15").status_code == 200
    s = client.get("/api/sources")
    assert s.status_code == 200 and len(s.json()) >= 7
    a = client.get("/api/argo?region=bob")
    assert a.status_code == 200 and len(a.json()["floats"]) >= 1
def test_reconstruct_schema():
    r = client.post("/api/reconstruct", json={"region": "bob", "date": "2024-07-15"})
    assert r.status_code == 200
    b = r.json()
    assert b["region"] == "bob"
    assert len(b["depths"]) == 15
    assert b["h"] == 120 and b["w"] == 240
    for k in REQUIRED_KEYS:
        assert k in b["metrics"] and isinstance(b["metrics"][k], float)
    assert len(b["profiles"]) >= 1
    p = b["profiles"][0]
    assert len(p["truth"]) == 15 and len(p["observed"]) == 15 and len(p["salinity"]) == 15
    assert len(b["surface"]["sst"]) == 120 * 240
    assert len(b["reconVolume"]) == 15 * 120 * 240
    assert len(b["truthVolume"]) == 15 * 120 * 240
    assert len(b["salVolume"]) == 15 * 120 * 240
    assert b["provenance"] == "remote / synthetic data / untrained weights"
    assert b["synthetic"] is True and b["untrained"] is True
    assert b["version"] == "0.1.0"
def test_reconstruct_determinism_and_modes():
    body = {"region": "bob", "date": "2024-07-15"}
    a = client.post("/api/reconstruct", json=body).json()
    b = client.post("/api/reconstruct", json=body).json()
    assert a["metrics"]["rmse"] == b["metrics"]["rmse"]
    assert a["reconVolume"][:20] == b["reconVolume"][:20]
    mlp = client.post("/api/reconstruct", json={"region": "bob", "date": "2024-07-15", "engineMode": "swin-mlp-oi"}).json()
    assert mlp["metrics"]["rmse"] >= a["metrics"]["rmse"] * 0.9
def test_reconstruct_validation():
    bad_region = client.post("/api/reconstruct", json={"region": "xx", "date": "2024-07-15"})
    assert bad_region.status_code == 422
    bad_date = client.post("/api/reconstruct", json={"region": "bob", "date": "1990-01-01"})
    assert bad_date.status_code == 422
    bad_engine = client.post("/api/reconstruct", json={"region": "bob", "date": "2024-07-15", "engineMode": "nope"})
    assert bad_engine.status_code == 422
    assert bad_engine.json()["code"] == "validation_error"
def test_validation_profiles():
    r = client.get("/api/validation/profiles?region=bob&date=2024-07-15")
    assert r.status_code == 200
    b = r.json()
    assert b["synthetic"] is True and b["untrained"] is True
    assert len(b["profiles"]) >= 1
    assert "metrics" in b
def test_datasources_status():
    r = client.get("/api/datasources/status")
    assert r.status_code == 200
    b = r.json()
    assert isinstance(b["configured"], bool)
    assert len(b["sources"]) >= 7
    for s in b["sources"]:
        assert "status" in s and "missingPct" in s
def test_stream_channel():
    r = client.get("/api/stream/reconstruct?region=bob&date=2024-07-15")
    assert r.status_code == 200
    assert "text/event-stream" in r.headers["content-type"]
    txt = r.text
    for stage in ["ingest", "harmonize", "embed", "decode", "physics", "validate"]:
        assert stage in txt
    assert "event: done" in txt
def test_credentials_not_configured():
    for k in ["COPERNICUS_USERNAME", "COPERNICUS_PASSWORD", "NASA_EARTHDATA_TOKEN"]:
        os.environ.pop(k, None)
    r = client.post("/api/reconstruct", json={"region": "bob", "date": "2024-07-15", "dataMode": "live"})
    assert r.status_code == 503
    b = r.json()
    assert b["code"] == "credentials_not_configured"
    assert "COPERNICUS_USERNAME" in b["missing"]
    assert "INCOIS_LAS_URL" not in b["missing"]
    s = client.get("/api/stream/reconstruct?region=bob&date=2024-07-15&dataMode=live")
    assert s.status_code == 503
    assert s.json()["code"] == "credentials_not_configured"
def test_argo_open_access_without_incois():
    for k in ["INCOIS_LAS_URL", "INCOIS_LAS_KEY", "CORIOLIS_CONFIG"]:
        os.environ.pop(k, None)
    h = client.get("/api/health").json()
    assert h["argoOpenAccess"] is True
    assert "INCOIS_LAS_URL" not in h["missingVars"]
    d = client.get("/api/datasources/status").json()
    argo = next(x for x in d["sources"] if x["id"] == "ARGO")
    assert argo["status"] == "open-access"
def test_error_format_consistent():
    r = client.get("/api/dates?region=nope")
    assert r.status_code == 422
    b = r.json()
    assert b["code"] == "invalid_region"
    assert "message" in b
    n = client.get("/api/nope-route-xyz")
    assert n.status_code == 404
    assert n.json()["code"] in ["not_found", "http_error"]
