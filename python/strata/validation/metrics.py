import numpy as np


def rmse(a, b):
    a = np.asarray(a, dtype=np.float64)
    b = np.asarray(b, dtype=np.float64)
    return float(np.sqrt(np.mean((a - b) ** 2)))
def bias(a, b):
    return float(np.mean(np.asarray(a) - np.asarray(b)))
def r2(a, b):
    a = np.asarray(a, dtype=np.float64)
    b = np.asarray(b, dtype=np.float64)
    ss_res = np.sum((b - a) ** 2)
    ss_tot = np.sum((b - b.mean()) ** 2)
    if ss_tot < 1e-12:
        return 0.0
    return float(1 - ss_res / ss_tot)
def thermo_depth(profile, depths):
    p = np.asarray(profile, dtype=np.float64)
    d = np.asarray(depths, dtype=np.float64)
    g = np.diff(p) / np.diff(d)
    k = int(np.argmin(g))
    return float((d[k] + d[k + 1]) / 2)
def thermo_error(pred, truth, depths):
    return float(abs(thermo_depth(pred, depths) - thermo_depth(truth, depths)))
def stability_loss(profile, depths):
    p = np.asarray(profile, dtype=np.float64)
    d = np.asarray(depths, dtype=np.float64)
    g = np.diff(p) / np.diff(d)
    pos = np.maximum(g, 0)
    return float(np.mean(pos ** 2))
def thermal_loss(resid=0.005):
    return float(abs(resid))
def combined(mse, l_stab, l_th, l1, l2):
    return float(mse + l1 * l_stab + l2 * l_th)
