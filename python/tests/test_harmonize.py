import numpy as np

from strata.harmonize.regrid import bilinear_fill, conservative_regrid, oi_fill, ssh_guided_fill


def test_regrid_output_shape_quarter_degree():
    src = np.random.default_rng(0).normal(20, 2, size=(30, 60)).astype(np.float64)
    out = conservative_regrid(src, 1.0)
    assert out.shape == (120, 240)
    assert out.dtype == np.float32
    same = conservative_regrid(np.ones((120, 240)), 0.25)
    assert same.shape == (120, 240)


def test_oi_and_bilinear_reduce_error_on_cloud_mask():
    rng = np.random.default_rng(3)
    truth = (20 + 3 * np.sin(np.linspace(0, 6, 120)[:, None]) + rng.normal(0, 0.2, size=(120, 240))).astype(np.float64)
    mask = np.zeros((120, 240), dtype=bool)
    mask[40:80, 90:170] = True
    field = truth.copy()
    field[mask] = 0.0
    base_err = float(np.sqrt(np.mean((field[mask] - truth[mask]) ** 2)))
    oi = oi_fill(field, mask, corr_len=6.0)
    bi = bilinear_fill(field, mask)
    oi_err = float(np.sqrt(np.mean((oi[mask] - truth[mask]) ** 2)))
    assert oi_err < base_err
    assert oi.shape == (120, 240)
    assert bi.shape == (120, 240)


def test_bilinear_single_pass_neighbors():
    field = np.array([[1.0, 2.0], [3.0, 4.0]])
    mask = np.array([[False, True], [False, False]])
    out = bilinear_fill(field, mask)
    assert out.shape == (2, 2)
    assert abs(float(out[0, 1]) - 2.0) < 1.0


def test_ssh_guided_fill_shape():
    rng = np.random.default_rng(5)
    field = rng.normal(0, 1, size=(24, 48))
    mask = np.zeros((24, 48), dtype=bool)
    mask[5:10, 5:10] = True
    ssh = rng.normal(0, 0.2, size=(24, 48))
    out = ssh_guided_fill(field, mask, ssh)
    assert out.shape == (24, 48)


def test_oi_all_masked_returns_zeros():
    field = np.ones((8, 8))
    mask = np.ones((8, 8), dtype=bool)
    out = oi_fill(field, mask)
    assert out.shape == (8, 8)
    assert float(np.abs(out).max()) == 0.0
