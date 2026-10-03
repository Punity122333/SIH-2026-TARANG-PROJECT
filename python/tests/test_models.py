import numpy as np

from strata.models.numpy_models import (
    masked_attention_weights,
    mlp_forward,
    monotonic_control_points,
    softplus,
    spline_eval,
)


def test_input_to_profile_shapes():
    rng = np.random.default_rng(0)
    z = rng.normal(0, 1, size=(2, 128)).astype(np.float64)
    ctrl = monotonic_control_points(z)
    assert ctrl.shape == (2, 15)
    prof = spline_eval(ctrl)
    assert prof.shape == (2, 15)


def test_land_tokens_get_zero_attention_weight():
    qk = np.zeros((2, 8))
    land = np.array([False, False, True, False, False, False, False, False])
    w = masked_attention_weights(qk, land)
    assert w.shape == (2, 8)
    assert abs(float(w[0, 2])) < 1e-6
    assert abs(float(w[1, 2])) < 1e-6
    assert abs(float(w.sum(axis=1)[0]) - 1.0) < 1e-5


def test_monotonic_decoder_never_increases():
    rng = np.random.default_rng(7)
    z = rng.normal(0, 1, size=(4, 64))
    ctrl = monotonic_control_points(z)
    d = np.diff(ctrl, axis=1)
    assert bool((d < 0).all())
    assert bool((d <= -0.04).all())


def test_softplus_positive_steps():
    x = np.array([-2.0, 0.0, 2.0])
    s = softplus(x)
    assert bool((s > 0).all())
    assert abs(float(s[1]) - np.log(2.0)) < 1e-9


def test_mlp_forward_shape():
    rng = np.random.default_rng(1)
    x = rng.normal(0, 1, size=(3, 16)).astype(np.float32)
    w1 = rng.normal(0, 0.5, size=(16, 32)).astype(np.float32)
    b1 = np.zeros(32, dtype=np.float32)
    w2 = rng.normal(0, 0.5, size=(32, 15)).astype(np.float32)
    b2 = np.zeros(15, dtype=np.float32)
    out = mlp_forward(x, w1, b1, w2, b2)
    assert out.shape == (3, 15)
