import numpy as np
import xarray as xr


def to_xarray(tensor, depths=None):
    t = np.asarray(tensor)
    dims = ["time", "channel", "y", "x"] if t.ndim == 4 else ["channel", "y", "x"]
    coords = {}
    if t.ndim == 4:
        coords = {"time": np.arange(t.shape[0]), "channel": np.arange(t.shape[1])}
    else:
        coords = {"channel": np.arange(t.shape[0])}
    return xr.DataArray(t, dims=dims, coords=coords)
def chunked(da, chunks=None):
    if chunks is None:
        chunks = {"time": 1, "channel": 7}
    try:
        return da.chunk(chunks)
    except (ValueError, AttributeError):
        return da
def save_npy(path, arr):
    np.save(path, np.asarray(arr))
def load_npy(path):
    return np.load(path, allow_pickle=False)
