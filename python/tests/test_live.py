import os

import numpy as np
import pytest

from strata.data import live


def write_fixture(path: str) -> None:
    import xarray as xr
    lats = np.arange(4.0, 23.0, 0.5, dtype=np.float64)
    lons = np.arange(79.0, 96.0, 0.5, dtype=np.float64)
    t, y, x = np.meshgrid(np.arange(2), lats, lons, indexing="ij")
    sst = 300.0 + 0.01 * y + 0.001 * x + 0.05 * t
    sst[:, 0:2, 0:2] = np.nan
    ds = xr.Dataset(
        {"analysed_sst": (("time", "latitude", "longitude"), sst)},
        coords={"time": np.array(["2024-07-15", "2024-07-16"], dtype="datetime64[D]"), "latitude": lats, "longitude": lons},
    )
    ds.to_netcdf(path, engine="h5netcdf")


def test_missing_creds_lists_names_only() -> None:
    saved_u = os.environ.pop("COPERNICUS_USERNAME", None)
    saved_p = os.environ.pop("COPERNICUS_PASSWORD", None)
    try:
        assert live.have_copernicus_creds() is False
        assert live.missing_copernicus_vars() == ["COPERNICUS_USERNAME", "COPERNICUS_PASSWORD"]
        assert live.sst_source_status() == "demo-synthetic"
        with pytest.raises(live.LiveError) as e:
            live.fetch_ostia_sst("bob", 80.0, 95.0, 5.0, 22.0, "2024-07-15", 120, 240)
        assert e.value.code == "credentials_not_configured"
        assert e.value.missing == ["COPERNICUS_USERNAME", "COPERNICUS_PASSWORD"]
    finally:
        if saved_u is not None:
            os.environ["COPERNICUS_USERNAME"] = saved_u
        if saved_p is not None:
            os.environ["COPERNICUS_PASSWORD"] = saved_p


def test_fetch_uses_cache_and_regrids(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("COPERNICUS_USERNAME", "u")
    monkeypatch.setenv("COPERNICUS_PASSWORD", "p")
    monkeypatch.setenv("STRATA_LIVE_CACHE", str(tmp_path))
    calls: list[str] = []

    def fake_download(dataset_id: str, lon_min: float, lon_max: float, lat_min: float, lat_max: float, date: str, path: str) -> str:
        calls.append(dataset_id)
        write_fixture(path)
        return path

    monkeypatch.setattr(live, "_download_ostia", fake_download)
    out = live.fetch_ostia_sst("bob", 80.0, 95.0, 5.0, 22.0, "2024-07-15", 120, 240)
    assert out["sst"].shape == (120, 240)
    assert out["dataset"] == live.OSTIA_REP_ID
    assert out["label"] == "SST (OSTIA REP)"
    grid = out["sst"]
    assert bool(np.isfinite(grid).any())
    assert 20.0 < float(np.nanmean(grid)) < 35.0
    out2 = live.fetch_ostia_sst("bob", 80.0, 95.0, 5.0, 22.0, "2024-07-15", 120, 240)
    assert out2["sst"].shape == (120, 240)
    assert calls == [live.OSTIA_REP_ID]


def test_fetch_failure_carries_no_secrets(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("COPERNICUS_USERNAME", "sentinel-user-abc")
    monkeypatch.setenv("COPERNICUS_PASSWORD", "sentinel-pass-xyz")
    monkeypatch.setenv("STRATA_LIVE_CACHE", str(tmp_path))

    def boom(dataset_id: str, lon_min: float, lon_max: float, lat_min: float, lat_max: float, date: str, path: str) -> str:
        raise RuntimeError("network down")

    monkeypatch.setattr(live, "_download_ostia", boom)
    with pytest.raises(live.LiveError) as e:
        live.fetch_ostia_sst("bob", 80.0, 95.0, 5.0, 22.0, "2024-07-15", 120, 240)
    assert e.value.code == "live_fetch_failed"
    assert "sentinel-user-abc" not in str(e.value)
    assert "sentinel-pass-xyz" not in str(e.value)


def test_pipeline_live_path_uses_observed_sst(monkeypatch: pytest.MonkeyPatch) -> None:
    from strata.pipeline import run_pipeline
    grid = np.full((120, 240), 27.5, dtype=np.float32)
    monkeypatch.setattr(live, "fetch_ostia_sst", lambda *a, **k: {"sst": grid, "dataset": live.OSTIA_REP_ID, "label": "SST (OSTIA REP)"})
    layers = {"sst": True, "sss": True, "ssh": True, "currents": True, "winds": True}
    physics = {"lambda1": 0.8, "lambda2": 0.4, "stabOn": True, "thermalOn": True, "monotonic": True}
    out = run_pipeline("bob", "2024-07-15", layers, physics, "swin-monotonic-oi", "oi", None, "live")
    assert "OSTIA" in out["provenance"]
    assert out["synthetic"] is True
    assert out["observed"] == ["SST (OSTIA REP)"]
    assert out["sourceStatus"][0] == {"id": "OSTIA", "mode": "observed", "note": "SST (OSTIA REP)"}


def test_pipeline_live_fallback_is_explicit(monkeypatch: pytest.MonkeyPatch) -> None:
    from strata.pipeline import run_pipeline

    def fail(*a, **k):
        raise live.LiveError("live_fetch_failed", "down", [])

    monkeypatch.setattr(live, "fetch_ostia_sst", fail)
    layers = {"sst": True, "sss": True, "ssh": True, "currents": True, "winds": True}
    physics = {"lambda1": 0.8, "lambda2": 0.4, "stabOn": True, "thermalOn": True, "monotonic": True}
    out = run_pipeline("bob", "2024-07-15", layers, physics, "swin-monotonic-oi", "oi", None, "live")
    assert "fallback" in out["provenance"]
    assert out["synthetic"] is True
    assert out["sourceStatus"][0]["mode"] == "synthetic-fallback"


def test_pipeline_demo_provenance_unchanged() -> None:
    from strata.pipeline import run_pipeline
    layers = {"sst": True, "sss": True, "ssh": True, "currents": True, "winds": True}
    physics = {"lambda1": 0.8, "lambda2": 0.4, "stabOn": True, "thermalOn": True, "monotonic": True}
    out = run_pipeline("bob", "2024-07-15", layers, physics, "swin-monotonic-oi", "oi")
    assert out["provenance"] == "remote / synthetic data / untrained weights"
    assert out["synthetic"] is True
    assert out["sourceStatus"][0]["mode"] == "synthetic"
