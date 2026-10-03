import numpy as np


def make_batch(b=2, seed=0):
    rng = np.random.default_rng(seed)
    x = rng.normal(0, 1, size=(b, 7, 7, 120, 240)).astype(np.float32)
    land = np.zeros((b, 120, 240), dtype=bool)
    return x, land
def smoke_shapes():
    x, _land = make_batch()
    assert x.shape == (2, 7, 7, 120, 240)
    from strata.models.numpy_models import monotonic_control_points
    z = x.mean(axis=(1, 3, 4))
    ctrl = monotonic_control_points(z)
    assert ctrl.shape == (2, 15)
    d = np.diff(ctrl, axis=1)
    assert bool((d <= 1e-6).all())
    return True
