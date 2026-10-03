import numpy as np

DEPTHS = np.array([0, 10, 25, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 750, 1000], dtype=np.float32)
H = 120
W = 240
C = 7
T = 7
def seeded(seed_text):
    h = 1779033703 ^ len(seed_text)
    for ch in seed_text:
        h = (h ^ ord(ch)) * 3432918353 & 0xFFFFFFFF
        h = ((h << 13) | (h >> 19)) & 0xFFFFFFFF
    return h
def prng(seed):
    a = seed & 0xFFFFFFFF
    def nxt():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = ((a ^ (a >> 15)) * (1 | a)) & 0xFFFFFFFF
        t = (t + (((t ^ (t >> 7)) * (61 | t)) & 0xFFFFFFFF)) & 0xFFFFFFFF ^ t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return nxt
def smooth_noise(h, w, rnd, octaves=3):
    out = np.zeros((h, w), dtype=np.float64)
    amp = 1.0
    tot = 0.0
    for o in range(octaves):
        gh = 4 + o * 5
        gw = 6 + o * 7
        grid = np.array([rnd() * 2 - 1 for _ in range(gh * gw)]).reshape(gh, gw)
        for r in range(h):
            fy = (r / h) * (gh - 1)
            y0 = int(fy)
            y1 = min(gh - 1, y0 + 1)
            ty = fy - y0
            sy = ty * ty * (3 - 2 * ty)
            for c in range(w):
                fx = (c / w) * (gw - 1)
                x0 = int(fx)
                x1 = min(gw - 1, x0 + 1)
                tx = fx - x0
                sx = tx * tx * (3 - 2 * tx)
                v = grid[y0, x0] * (1 - sx) * (1 - sy) + grid[y0, x1] * sx * (1 - sy) + grid[y1, x0] * (1 - sx) * sy + grid[y1, x1] * sx * sy
                out[r, c] += v * amp
        tot += amp
        amp *= 0.55
    return (out / tot).astype(np.float32)
def synthetic_tensor(region="bob", date="2024-07-15"):
    rnd = prng(seeded(region + date))
    n = smooth_noise(H, W, rnd)
    sst = (28 + n).astype(np.float32)
    sss = (34.5 + n * 0.3).astype(np.float32)
    ssh = (n * 0.2).astype(np.float32)
    cur = np.zeros((2, H, W), dtype=np.float32)
    wind = np.zeros((2, H, W), dtype=np.float32)
    x = np.stack([sst, sss, ssh, cur[0], cur[1], wind[0], wind[1]], axis=0)
    win = np.stack([x for _ in range(T)], axis=0)
    return win
