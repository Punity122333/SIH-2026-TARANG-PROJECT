import datetime
import os

import numpy as np

OSTIA_REP_ID = "METOFFICE-GLO-SST-L4-REP-OBS-SST"
OSTIA_NRT_ID = "METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2"
OSTIA_VARIABLE = "analysed_sst"
KELVIN_OFFSET = 273.15
COPERNICUS_USER_VAR = "COPERNICUS_USERNAME"
COPERNICUS_PASS_VAR = "COPERNICUS_PASSWORD"


class LiveError(Exception):
    def __init__(self, code: str, message: str, missing: list[str] | None = None):
        super().__init__(message)
        self.code = code
        self.missing: list[str] = list(missing) if missing else []


def cache_dir() -> str:
    d = os.environ.get("STRATA_LIVE_CACHE", "artifacts/live")
    os.makedirs(d, exist_ok=True)
    return d


def cache_path(source: str, region: str, date: str) -> str:
    safe_region = "".join(c if c.isalnum() else "_" for c in region)
    safe_date = "".join(c if c.isalnum() else "_" for c in date)
    return os.path.join(cache_dir(), safe_region + "_" + safe_date + "_" + source + ".nc")


def have_copernicus_creds() -> bool:
    return bool(os.environ.get(COPERNICUS_USER_VAR)) and bool(os.environ.get(COPERNICUS_PASS_VAR))


def missing_copernicus_vars() -> list[str]:
    return [v for v in [COPERNICUS_USER_VAR, COPERNICUS_PASS_VAR] if not os.environ.get(v)]


def package_present(name: str) -> bool:
    import importlib.util
    return importlib.util.find_spec(name) is not None


def sst_source_status() -> str:
    if have_copernicus_creds() and package_present("copernicusmarine"):
        return "live"
    return "demo-synthetic"


def next_day(date: str) -> str:
    dt = datetime.date(int(date[0:4]), int(date[5:7]), int(date[8:10])) + datetime.timedelta(days=1)
    return dt.isoformat()


def _download_ostia(dataset_id: str, lon_min: float, lon_max: float, lat_min: float, lat_max: float, date: str, path: str) -> str:
    import copernicusmarine
    copernicusmarine.subset(
        dataset_id=dataset_id,
        variables=[OSTIA_VARIABLE],
        start_datetime=date + "T00:00:00",
        end_datetime=next_day(date) + "T00:00:00",
        minimum_longitude=lon_min,
        maximum_longitude=lon_max,
        minimum_latitude=lat_min,
        maximum_latitude=lat_max,
        output_directory=os.path.dirname(path) or ".",
        output_filename=os.path.basename(path),
        username=os.environ.get(COPERNICUS_USER_VAR),
        password=os.environ.get(COPERNICUS_PASS_VAR),
        overwrite=True,
        disable_progress_bar=True,
    )
    return path


def _read_ostia_grid(path: str) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    import xarray as xr
    ds = xr.open_dataset(path, engine="h5netcdf")
    try:
        da = ds[OSTIA_VARIABLE]
        if "time" in da.dims:
            da = da.mean(dim="time", skipna=True)
        lats = np.asarray(ds["latitude"].values, dtype=np.float64)
        lons = np.asarray(ds["longitude"].values, dtype=np.float64)
        vals = np.asarray(da.values, dtype=np.float64)
    finally:
        ds.close()
    return vals - KELVIN_OFFSET, lats, lons


def _bilinear_to_grid(vals: np.ndarray, lats: np.ndarray, lons: np.ndarray, h: int, w: int, lat_max: float, lat_span: float, lon_min: float, lon_span: float) -> np.ndarray:
    lat_asc = lats if lats[0] < lats[-1] else lats[::-1]
    src = vals if lats[0] < lats[-1] else vals[::-1, :]
    tgt_lat = lat_max - (np.arange(h, dtype=np.float64) + 0.5) / h * lat_span
    tgt_lon = lon_min + (np.arange(w, dtype=np.float64) + 0.5) / w * lon_span
    ri = np.searchsorted(lat_asc, tgt_lat) - 1
    ci = np.searchsorted(lons, tgt_lon) - 1
    ri = np.clip(ri, 0, len(lat_asc) - 2)
    ci = np.clip(ci, 0, len(lons) - 2)
    fr = (tgt_lat - lat_asc[ri]) / np.maximum(1e-12, lat_asc[ri + 1] - lat_asc[ri])
    fc = (tgt_lon - lons[ci]) / np.maximum(1e-12, lons[ci + 1] - lons[ci])
    v00 = src[ri[:, None], ci[None, :]]
    v01 = src[ri[:, None], ci[None, :] + 1]
    v10 = src[(ri + 1)[:, None], ci[None, :]]
    v11 = src[(ri + 1)[:, None], ci[None, :] + 1]
    good = np.isfinite(v00) & np.isfinite(v01) & np.isfinite(v10) & np.isfinite(v11)
    out = np.full((h, w), np.nan, dtype=np.float64)
    out[good] = (v00 * (1 - fr[:, None]) * (1 - fc[None, :]) + v01 * (1 - fr[:, None]) * fc[None, :] + v10 * fr[:, None] * (1 - fc[None, :]) + v11 * fr[:, None] * fc[None, :])[good]
    return out.astype(np.float32)


def fetch_ostia_sst(region: str, lon_min: float, lon_max: float, lat_min: float, lat_max: float, date: str, h: int, w: int) -> dict:
    if not have_copernicus_creds():
        raise LiveError("credentials_not_configured", "Copernicus Marine credentials are not configured on the server", missing_copernicus_vars())
    if not package_present("copernicusmarine"):
        raise LiveError("live_package_missing", "copernicusmarine Python package is not installed", [])
    path = cache_path("ostia", region, date)
    dataset = OSTIA_REP_ID
    import copernicusmarine.catalogue_parser.models as cat_models
    import copernicusmarine.core_functions.credentials_utils as cred_utils
    import copernicusmarine.core_functions.exceptions as core_exc
    tolerated = (
        cat_models.DatasetNotFound,
        cat_models.ProductNotFound,
        cat_models.DatasetIsNotPartOfTheProduct,
        cred_utils.InvalidUsernameOrPassword,
        cred_utils.CredentialsCannotBeNone,
        cred_utils.CouldNotConnectToAuthenticationSystem,
        core_exc.ServiceNotAvailable,
        core_exc.NoServiceAvailable,
        core_exc.CoordinatesOutOfDatasetBounds,
        core_exc.VariableDoesNotExistInTheDataset,
        core_exc.DatasetUpdating,
        OSError,
        ValueError,
        RuntimeError,
    )
    if not (os.path.isfile(path) and os.path.getsize(path) > 0):
        try:
            _download_ostia(OSTIA_REP_ID, lon_min, lon_max, lat_min, lat_max, date, path)
        except tolerated:
            dataset = OSTIA_NRT_ID
            try:
                _download_ostia(OSTIA_NRT_ID, lon_min, lon_max, lat_min, lat_max, date, path)
            except tolerated as e:
                raise LiveError("live_fetch_failed", "OSTIA download failed for " + region + " " + date, []) from e
    try:
        vals, lats, lons = _read_ostia_grid(path)
    except tolerated:
        raise LiveError("live_read_failed", "OSTIA cache file for " + region + " " + date + " could not be read", [])
    grid = _bilinear_to_grid(vals, lats, lons, h, w, lat_max, lat_max - lat_min, lon_min, lon_max - lon_min)
    label = "SST (OSTIA REP)" if dataset == OSTIA_REP_ID else "SST (OSTIA NRT)"
    return {"sst": grid, "dataset": dataset, "label": label}
