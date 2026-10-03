import json
import os

import numpy as np
from fastapi.testclient import TestClient

from api.main import app
from strata.models.numpy_models import monotonic_control_points
from strata.pipeline import run_pipeline


def test_decoder_enforces_temperature_nonincreasing_not_density():
    rng = np.random.default_rng(11)
    z = rng.normal(0, 1, size=(3, 48))
    ctrl = monotonic_control_points(z)
    assert ctrl.shape == (3, 15)
    d = np.diff(ctrl, axis=1)
    assert bool((d < 0).all())
    assert bool((d <= -0.04).all())


def test_pipeline_monotonic_clamp_is_temperature():
    layers = {"sst": True, "sss": True, "ssh": True, "currents": True, "winds": True}
    phys = {"lambda1": 0.8, "lambda2": 0.4, "stabOn": True, "thermalOn": True, "monotonic": True}
    r = run_pipeline("bob", "2024-07-15", layers, phys, "swin-monotonic-oi", "oi")
    recon = np.array(r["reconVolume"], dtype=np.float64).reshape(15, 120, 240)
    land = np.array(r["surface"]["land"]).reshape(120, 240)
    checked = 0
    for rr in range(0, 120, 17):
        for cc in range(0, 240, 29):
            if land[rr, cc] == 1:
                continue
            col = recon[:, rr, cc]
            if not np.all(np.isfinite(col)):
                continue
            assert bool((np.diff(col) <= 1e-9).all())
            checked += 1
    assert checked > 5


def test_contract_all_volumes_validate_against_schema():
    client = TestClient(app)
    body = {"region": "bob", "date": "2024-07-15"}
    a = client.post("/api/reconstruct", json=body).json()
    assert len(a["depths"]) == 15
    assert a["h"] == 120 and a["w"] == 240
    assert len(a["reconVolume"]) == 15 * 120 * 240
    assert len(a["truthVolume"]) == 15 * 120 * 240
    assert len(a["salVolume"]) == 15 * 120 * 240
    need = ["rmse", "bias", "r2", "thermoErr", "uohc", "mse", "lStab", "lThermal", "total", "missingPct", "surfaceTemp", "thermoDepth"]
    for k in need:
        assert k in a["metrics"]
    assert a["synthetic"] is True and a["untrained"] is True


def test_golden_reference_within_tolerance():
    here = os.path.join(os.path.dirname(__file__), "golden.json")
    with open(here) as fh:
        ref = json.load(fh)
    layers = {"sst": True, "sss": True, "ssh": True, "currents": True, "winds": True}
    phys = {"lambda1": 0.8, "lambda2": 0.4, "stabOn": True, "thermalOn": True, "monotonic": True}
    r = run_pipeline("bob", "2024-07-15", layers, phys, "swin-monotonic-oi", "oi")
    for k, v in ref["metrics"].items():
        assert abs(r["metrics"][k] - v) < 1e-9
    assert r["depths"] == ref["depths"]
    for i, v in enumerate(ref["reconSample"]):
        assert abs(r["reconVolume"][i] - v) < 1e-6
