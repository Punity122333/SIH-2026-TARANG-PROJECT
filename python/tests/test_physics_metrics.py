import numpy as np

from strata.physics.losses import stability_on_profile, thermal_wind_residual, total_loss
from strata.validation.metrics import (
    bias,
    combined,
    r2,
    rmse,
    stability_loss,
    thermal_loss,
    thermo_depth,
    thermo_error,
)


def test_hand_rmse_bias_r2():
    assert rmse([1.0, 2.0, 3.0], [1.0, 2.0, 3.0]) == 0.0
    assert bias([1.0, 2.0, 3.0], [1.0, 2.0, 3.0]) == 0.0
    assert r2([1.0, 2.0, 3.0], [1.0, 2.0, 3.0]) == 1.0
    got = rmse([2.0, 4.0], [0.0, 0.0])
    assert abs(got - np.sqrt(10.0)) < 1e-9
    assert bias([2.0, 4.0], [0.0, 0.0]) == 3.0


def test_r2_degenerate_returns_zero():
    assert r2([5.0, 5.0, 5.0], [5.0, 5.0, 5.0]) == 0.0


def test_thermo_depth_tracks_max_cooling():
    depths = [0, 10, 25, 50, 75, 100, 150, 200]
    prof = [28, 27.8, 27.5, 26, 22, 18, 12, 8]
    td = thermo_depth(prof, depths)
    assert 50 <= td <= 100
    assert thermo_error(prof, prof, depths) == 0.0
    shifted = [28, 27.8, 27.5, 26, 22, 18, 12, 8]
    assert thermo_error(shifted, prof, depths) == 0.0


def test_stability_matches_hand_formula():
    depths = [0, 50, 100, 200]
    assert stability_loss([28, 27, 20, 10], depths) == 0.0
    assert stability_on_profile([28, 27, 20, 10], depths) == 0.0
    bad = stability_loss([28, 29, 20, 10], depths)
    expect = ((1.0 / 50.0) ** 2) / 3.0
    assert abs(bad - expect) < 1e-12
    assert stability_on_profile([28, 29, 20, 10], depths) == bad


def test_total_loss_weighting_and_switches():
    assert total_loss(1.0, 0.5, 0.2, 0.8, 0.4, True, True) == 1.0 + 0.8 * 0.5 + 0.4 * 0.2
    assert total_loss(1.0, 0.5, 0.2, 0.8, 0.4, False, False) == 1.0
    assert total_loss(1.0, 0.5, 0.2, 0.8, 0.4, True, False) == 1.0 + 0.8 * 0.5
    assert combined(1.0, 0.5, 0.2, 0.8, 0.4) == 1.0 + 0.8 * 0.5 + 0.4 * 0.2


def test_thermal_losses():
    assert thermal_loss(0.005) == 0.005
    assert thermal_wind_residual(0.004, 1.0) == 0.004
    assert thermal_wind_residual(-0.004, 2.0) == 0.008


def test_lambda1_never_increases_stability_term():
    from strata.pipeline import run_pipeline
    base_layers = {"sst": True, "sss": True, "ssh": True, "currents": True, "winds": True}
    lo = run_pipeline("bob", "2024-07-15", base_layers, {"lambda1": 0.2, "lambda2": 0.4, "stabOn": True, "thermalOn": True, "monotonic": True}, "swin-monotonic-oi", "oi")
    hi = run_pipeline("bob", "2024-07-15", base_layers, {"lambda1": 2.5, "lambda2": 0.4, "stabOn": True, "thermalOn": True, "monotonic": True}, "swin-monotonic-oi", "oi")
    assert hi["metrics"]["lStab"] <= lo["metrics"]["lStab"] + 1e-9
