import numpy as np


def conservative_regrid(src, src_res, dst_h=120, dst_w=240):
    a = np.asarray(src, dtype=np.float64)
    scale = src_res / 0.25
    if abs(scale - 1.0) < 1e-9:
        return a.astype(np.float32)
    from scipy.ndimage import zoom as _zoom
    z = 1.0 / scale
    if a.ndim == 2:
        out = _zoom(a, z, order=1)
        return _resize(out, dst_h, dst_w).astype(np.float32)
    out = _zoom(a, [1] * (a.ndim - 2) + [z, z], order=1)
    return _resize_nd(out, dst_h, dst_w).astype(np.float32)
def _resize(a, dh, dw):
    h, w = a.shape
    ys = (np.linspace(0, 1, dh) * (h - 1)).astype(int)
    xs = (np.linspace(0, 1, dw) * (w - 1)).astype(int)
    return a[ys][:, xs]
def _resize_nd(a, dh, dw):
    h, w = a.shape[-2], a.shape[-1]
    ys = (np.linspace(0, 1, dh) * (h - 1)).astype(int)
    xs = (np.linspace(0, 1, dw) * (w - 1)).astype(int)
    return a[..., ys][..., :, xs]
def oi_fill(field, mask, corr_len=6.0):
    f = np.asarray(field, dtype=np.float64)
    m = np.asarray(mask, dtype=bool)
    out = f.copy()
    good = ~m
    if good.sum() == 0:
        return np.zeros_like(f)
    gy, gx = np.where(good)
    vals = f[good]
    my, mx = np.where(m)
    for y, x in zip(my.tolist(), mx.tolist()):
        d2 = (gy - y) ** 2 + (gx - x) ** 2
        w = np.exp(-d2 / (2 * corr_len * corr_len))
        w = w / (w.sum() + 1e-9)
        out[y, x] = float((w * vals).sum())
    return out.astype(np.float32)
def bilinear_fill(field, mask):
    f = np.asarray(field, dtype=np.float64)
    m = np.asarray(mask, dtype=bool)
    out = f.copy()
    h, w = f.shape
    for y in range(h):
        for x in range(w):
            if m[y, x]:
                s = 0.0
                n = 0
                for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and not m[yy, xx]:
                        s += f[yy, xx]
                        n += 1
                out[y, x] = s / n if n > 0 else 0.0
    return out.astype(np.float32)
def ssh_guided_fill(field, mask, ssh, alpha=0.6):
    base = oi_fill(field, mask)
    s = np.asarray(ssh, dtype=np.float64)
    s = (s - s.mean()) / (s.std() + 1e-9)
    return (base + alpha * s.astype(np.float32) * 0.1).astype(np.float32)
