import asyncio
import json
import os
import re

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from api.schemas import (
    STRATA_VERSION,
    ReconRequest,
)
from strata.data.live import sst_source_status
from strata.data.synthetic import DEPTHS
from strata.pipeline import REGION_BOUNDS, STAGES, run_pipeline

router = APIRouter()
SOURCES = [
    {"id": "OSTIA", "variable": "SST", "resolution": "0.05deg", "org": "Copernicus", "role": "Surface input"},
    {"id": "SMAP / SMOS", "variable": "SSS", "resolution": "0.125deg", "org": "Copernicus", "role": "Surface input"},
    {"id": "DUACS", "variable": "SSH / SLA", "resolution": "0.25deg", "org": "Copernicus", "role": "Surface input guides gap filling"},
    {"id": "OSCAR", "variable": "Surface currents", "resolution": "0.25deg", "org": "PODAAC", "role": "Surface input"},
    {"id": "CCMP", "variable": "Winds", "resolution": "0.25deg", "org": "PODAAC", "role": "Surface input"},
    {"id": "GLORYS12v2", "variable": "Reanalysis", "resolution": "0.083deg", "org": "Copernicus", "role": "Training target"},
    {"id": "ARGO", "variable": "Profiles via Coriolis GDAC open access", "resolution": "profile", "org": "Coriolis", "role": "Independent held-out validation never trained on"},
]
REQUIRED_LIVE_VARS = ["COPERNICUS_USERNAME", "COPERNICUS_PASSWORD", "NASA_EARTHDATA_TOKEN"]
OPTIONAL_LIVE_VARS = ["INCOIS_LAS_URL", "INCOIS_LAS_KEY", "CORIOLIS_CONFIG"]
DATE_RE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")
def live_status():
    missing = [k for k in REQUIRED_LIVE_VARS if not os.environ.get(k)]
    optional_missing = [k for k in OPTIONAL_LIVE_VARS if not os.environ.get(k)]
    return len(missing) == 0, missing, optional_missing
def check_date(v):
    m = DATE_RE.match(v)
    if not m:
        raise HTTPException(status_code=422, detail={"ok": False, "code": "invalid_date", "message": "date must be YYYY-MM-DD in 2000-01-01 to 2030-12-31"})
    if v < "2000-01-01" or v > "2030-12-31":
        raise HTTPException(status_code=422, detail={"ok": False, "code": "invalid_date", "message": "date must be YYYY-MM-DD in 2000-01-01 to 2030-12-31"})
    return v
def check_region(v):
    if v not in REGION_BOUNDS:
        raise HTTPException(status_code=422, detail={"ok": False, "code": "invalid_region", "message": "unknown region"})
    return v
def to_payload(req):
    layers = req.layers.model_dump() if hasattr(req.layers, "model_dump") else dict(req.layers)
    physics = req.physics.model_dump() if hasattr(req.physics, "model_dump") else dict(req.physics)
    upload = None
    if req.uploadTensor is not None and req.uploadShape is not None:
        try:
            import numpy as np
            a = np.asarray(req.uploadTensor, dtype=np.float32)
            if a.size == 120 * 240:
                upload = a.tolist()
        except (ValueError, TypeError):
            upload = None
    return layers, physics, upload
@router.get("/health")
def health():
    ok, missing, optional_missing = live_status()
    return {"ok": True, "version": STRATA_VERSION, "engines": ["swin-monotonic-oi", "resnet-monotonic-oi", "swin-mlp-oi", "swin-monotonic-bilinear", "map-2d-only"], "liveConfigured": ok, "missingVars": missing, "optionalVars": optional_missing, "argoOpenAccess": True, "mode": "remote-synthetic-untrained"}
@router.get("/regions")
def regions():
    return [{"id": k, "label": v["label"], "latMin": v["latMin"], "latMax": v["latMax"], "lonMin": v["lonMin"], "lonMax": v["lonMax"]} for k, v in REGION_BOUNDS.items()]
@router.get("/dates")
def dates(region: str = Query(default="bob")):
    check_region(region)
    return {"region": region, "dates": ["2024-01-15", "2024-04-15", "2024-07-15", "2024-10-15", "2025-01-15"]}
@router.get("/meta")
def meta(region: str = "bob", date: str = "2024-07-15"):
    check_region(region)
    check_date(date)
    return {"region": region, "date": date, "grid": [120, 240], "depths": DEPTHS.tolist()}
@router.get("/sources")
def sources():
    return SOURCES
@router.get("/datasources/status")
def datasource_status():
    ok, missing, optional_missing = live_status()
    base_missing = [12.5, 17.4, 2.1, 8.0, 7.2, 0.0, 0.0]
    out = []
    ostia = sst_source_status() if ok else "demo-synthetic"
    for i, s in enumerate(SOURCES):
        if s["id"] == "ARGO":
            status = "open-access"
        elif s["id"] == "OSTIA":
            status = ostia
        else:
            status = "demo-synthetic"
        out.append({"id": s["id"], "variable": s["variable"], "resolution": s["resolution"], "org": s["org"], "role": s["role"], "status": status, "latencyMs": round(20 + i * 7.5, 1), "missingPct": base_missing[i]})
    return {"configured": ok, "missingVars": missing, "optionalVars": optional_missing, "sources": out}
@router.get("/argo")
def argo(region: str = "bob"):
    check_region(region)
    r = run_pipeline(region, "2024-07-15", {"sst": True, "sss": True, "ssh": True, "currents": True, "winds": True}, {"lambda1": 0.8, "lambda2": 0.4, "stabOn": True, "thermalOn": True, "monotonic": True}, "swin-monotonic-oi", "oi")
    floats = [{"id": p["id"], "lat": p["lat"], "lon": p["lon"]} for p in r["profiles"]]
    return {"region": region, "floats": floats}
@router.get("/validation/profiles")
def validation_profiles(region: str = Query(default="bob"), date: str = Query(default="2024-07-15")):
    check_region(region)
    check_date(date)
    r = run_pipeline(region, date, {"sst": True, "sss": True, "ssh": True, "currents": True, "winds": True}, {"lambda1": 0.8, "lambda2": 0.4, "stabOn": True, "thermalOn": True, "monotonic": True}, "swin-monotonic-oi", "oi")
    return {"region": region, "date": date, "depths": r["depths"], "profiles": r["profiles"], "metrics": r["metrics"], "provenance": r["provenance"], "synthetic": True, "untrained": True}
@router.post("/reconstruct")
def reconstruct(req: ReconRequest):
    check_region(req.region)
    check_date(req.date)
    if req.uploadTensor is not None and len(req.uploadTensor) > 120 * 240 + 10:
        raise HTTPException(status_code=413, detail={"ok": False, "code": "payload_too_large", "message": "upload exceeds 120x240 limit"})
    if req.dataMode == "live":
        ok, missing, _optional_missing = live_status()
        if not ok:
            raise HTTPException(status_code=503, detail={"ok": False, "code": "credentials_not_configured", "message": "Live data credentials are not configured on the server", "missing": missing})
    layers, physics, upload = to_payload(req)
    out = run_pipeline(req.region, req.date, layers, physics, req.engineMode, req.gapMethod, upload, req.dataMode)
    return out
@router.get("/stream/reconstruct")
async def stream_reconstruct(region: str = Query(default="bob"), date: str = Query(default="2024-07-15"), engineMode: str = Query(default="swin-monotonic-oi"), gapMethod: str = Query(default="oi"), dataMode: str = Query(default="demo"), lambda1: float = Query(default=0.8), lambda2: float = Query(default=0.4)):
    check_region(region)
    check_date(date)
    if engineMode not in ["swin-monotonic-oi", "resnet-monotonic-oi", "swin-mlp-oi", "swin-monotonic-bilinear", "map-2d-only"]:
        raise HTTPException(status_code=422, detail={"ok": False, "code": "invalid_engine", "message": "unknown engineMode"})
    if gapMethod not in ["oi", "gp", "ssh", "bilinear"]:
        raise HTTPException(status_code=422, detail={"ok": False, "code": "invalid_gap", "message": "unknown gapMethod"})
    if dataMode == "live":
        ok, missing, _optional_missing = live_status()
        if not ok:
            raise HTTPException(status_code=503, detail={"ok": False, "code": "credentials_not_configured", "message": "Live data credentials are not configured on the server", "missing": missing})
    layers = {"sst": True, "sss": True, "ssh": True, "currents": True, "winds": True}
    physics = {"lambda1": float(lambda1), "lambda2": float(lambda2), "stabOn": True, "thermalOn": True, "monotonic": True}
    async def gen():
        for i, stage in enumerate(STAGES):
            payload = json.dumps({"stage": stage, "index": i, "total": len(STAGES), "progress": round((i + 1) / (len(STAGES) + 1), 3)})
            yield "event: stage\ndata: " + payload + "\n\n"
            await asyncio.sleep(0.05)
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, lambda: run_pipeline(region, date, layers, physics, engineMode, gapMethod, None, dataMode))
        slim = {"region": result["region"], "date": result["date"], "depths": result["depths"], "h": result["h"], "w": result["w"], "metrics": result["metrics"], "profiles": result["profiles"], "surface": result["surface"], "truthVolume": result["truthVolume"], "reconVolume": result["reconVolume"], "salVolume": result["salVolume"], "ingest": result["ingest"], "provenance": result["provenance"], "synthetic": True, "untrained": True, "engineMode": result["engineMode"], "gapMethod": result["gapMethod"], "version": result["version"], "timingMs": result["timingMs"]}
        yield "event: done\ndata: " + json.dumps(slim) + "\n\n"
    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
