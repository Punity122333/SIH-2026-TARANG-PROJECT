import numpy as np
from hypothesis import given, settings
from hypothesis import strategies as st

from strata.models.numpy_models import monotonic_control_points
from strata.pipeline import run_pipeline
from strata.validation.metrics import rmse


def test_argo_holdout_never_in_training_split():
    from strata.data.split import argo_holdout, assert_holdout
    ids = [f"F{i:02d}" for i in range(8)]
    tr, ho = argo_holdout(ids)
    assert assert_holdout(tr, ho)
    assert len(tr) + len(ho) == 8
    for _ in range(5):
        tr2, ho2 = argo_holdout(ids, seed=7)
        assert len(set(tr2) & set(ho2)) == 0
        assert set(tr2) | set(ho2) == set(ids)


@given(st.lists(st.floats(min_value=-5, max_value=35, allow_nan=False, allow_infinity=False), min_size=1, max_size=10))
@settings(max_examples=40, deadline=None)
def test_metrics_invariant_to_ordering(vals):
    truth = list(vals)
    pred = [v + 0.5 for v in vals]
    assert abs(rmse(pred, truth) - rmse(list(reversed(pred)), list(reversed(truth)))) < 1e-9


@given(st.sampled_from(["bob", "arabian", "indian", "custom"]), st.sampled_from(["2024-01-15", "2024-07-15", "2025-01-15"]))
@settings(max_examples=5, deadline=None)
def test_engine_deterministic_for_any_valid_input(region, date):
    layers = {"sst": True, "sss": True, "ssh": True, "currents": True, "winds": True}
    phys = {"lambda1": 0.8, "lambda2": 0.4, "stabOn": True, "thermalOn": True, "monotonic": True}
    a = run_pipeline(region, date, layers, phys, "swin-monotonic-oi", "oi")
    b = run_pipeline(region, date, layers, phys, "swin-monotonic-oi", "oi")
    assert a["metrics"]["rmse"] == b["metrics"]["rmse"]
    assert a["reconVolume"][:10] == b["reconVolume"][:10]


@given(st.integers(min_value=1, max_value=4))
@settings(max_examples=20, deadline=None)
def test_decoder_constraint_holds_for_arbitrary_latents(n):
    rng = np.random.default_rng(1000 + n)
    z = rng.normal(0, 1, size=(n, 32))
    ctrl = monotonic_control_points(z)
    d = np.diff(ctrl, axis=1)
    assert bool((d < 0).all())
