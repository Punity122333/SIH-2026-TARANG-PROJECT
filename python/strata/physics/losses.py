import numpy as np


def stability_on_profile(temp, depths):
    t = np.asarray(temp, dtype=np.float64)
    d = np.asarray(depths, dtype=np.float64)
    g = np.diff(t) / np.diff(d)
    return float(np.mean(np.maximum(g, 0) ** 2))
def thermal_wind_residual(density_shear=0.004, l2_scale=1.0):
    return float(abs(density_shear) * l2_scale)
def total_loss(mse, l_stab, l_th, l1, l2, stab_on=True, thermal_on=True):
    a = l1 if stab_on else 0.0
    b = l2 if thermal_on else 0.0
    return float(mse + a * l_stab + b * l_th)
