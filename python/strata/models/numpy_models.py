import numpy as np


def softplus(x):
    return np.log1p(np.exp(-np.abs(x))) + np.maximum(x, 0)
def monotonic_control_points(z, n_levels=15, top=28.0):
    z = np.asarray(z, dtype=np.float64)
    b = z.reshape(z.shape[0], -1).mean(axis=1)
    steps = softplus(b[:, None] * 0 + np.linspace(0.2, 1.4, n_levels - 1)[None, :])
    ctrl = np.zeros((z.shape[0], n_levels))
    ctrl[:, 0] = top + b * 0.1
    for k in range(1, n_levels):
        ctrl[:, k] = ctrl[:, k - 1] - steps[:, k - 1]
    return ctrl.astype(np.float32)
def masked_attention_weights(qk, land_mask):
    w = np.asarray(qk, dtype=np.float64).copy()
    m = np.asarray(land_mask, dtype=bool)
    w[:, m] = -1e9
    e = np.exp(w - w.max(axis=1, keepdims=True))
    return (e / (e.sum(axis=1, keepdims=True) + 1e-12)).astype(np.float32)
def spline_eval(ctrl, depths=None, n_out=15):
    c = np.asarray(ctrl, dtype=np.float64)
    return c[:, :n_out].astype(np.float32)
def mlp_forward(x, w1, b1, w2, b2):
    h = np.maximum(0, np.asarray(x) @ np.asarray(w1) + np.asarray(b1))
    return (h @ np.asarray(w2) + np.asarray(b2)).astype(np.float32)
