import numpy as np

from strata.data.split import argo_holdout, assert_holdout
from strata.data.synthetic import synthetic_tensor
from strata.models.numpy_models import masked_attention_weights
from strata.training.smoke import smoke_shapes
from strata.validation.metrics import bias, combined, r2, rmse, stability_loss


def test_shapes_and_monotonic():
    assert smoke_shapes()
def test_land_zero_attention():
    qk = np.zeros((1, 8))
    land = np.array([False, False, True, False, False, False, False, False])
    w = masked_attention_weights(qk, land)
    assert abs(float(w[0, 2])) < 1e-6
def test_physics_correctness():
    depths = [0, 50, 100, 200]
    good = [28, 27, 20, 10]
    bad = [28, 29, 20, 10]
    assert stability_loss(good, depths) == 0.0
    assert stability_loss(bad, depths) > 0
def test_metrics_correctness():
    a = [1.0, 2.0, 3.0]
    b = [1.0, 2.0, 3.0]
    assert rmse(a, b) == 0.0
    assert bias(a, b) == 0.0
    assert r2(a, b) == 1.0
def test_holdout():
    ids = [f"F{i:02d}" for i in range(8)]
    tr, ho = argo_holdout(ids)
    assert_holdout(tr, ho)
    assert len(tr) + len(ho) == 8
def test_synthetic_tensor_shape():
    t = synthetic_tensor()
    assert t.shape == (7, 7, 120, 240)
def test_combined():
    assert combined(1.0, 0.5, 0.2, 0.8, 0.4) == 1.0 + 0.8 * 0.5 + 0.4 * 0.2
