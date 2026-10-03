
from pydantic import BaseModel, Field

STRATA_VERSION = "0.1.0"
VALID_REGIONS = ["bob", "arabian", "indian", "custom"]
VALID_ENGINE_MODES = ["swin-monotonic-oi", "resnet-monotonic-oi", "swin-mlp-oi", "swin-monotonic-bilinear", "map-2d-only"]
VALID_GAP_METHODS = ["oi", "gp", "ssh", "bilinear"]
VALID_DATA_MODES = ["demo", "live"]
class LayerToggles(BaseModel):
    sst: bool = True
    sss: bool = True
    ssh: bool = True
    currents: bool = True
    winds: bool = True
class PhysicsConfig(BaseModel):
    lambda1: float = Field(default=0.8, ge=0.0, le=5.0)
    lambda2: float = Field(default=0.4, ge=0.0, le=5.0)
    stabOn: bool = True
    thermalOn: bool = True
    monotonic: bool = True
class ReconRequest(BaseModel):
    region: str = Field(default="bob", pattern="^(bob|arabian|indian|custom)$")
    date: str = Field(default="2024-07-15", pattern="^\\d{4}-\\d{2}-\\d{2}$")
    layers: LayerToggles = Field(default_factory=LayerToggles)
    physics: PhysicsConfig = Field(default_factory=PhysicsConfig)
    engineMode: str = Field(default="swin-monotonic-oi", pattern="^(swin-monotonic-oi|resnet-monotonic-oi|swin-mlp-oi|swin-monotonic-bilinear|map-2d-only)$")
    gapMethod: str = Field(default="oi", pattern="^(oi|gp|ssh|bilinear)$")
    dataMode: str = Field(default="demo", pattern="^(demo|live)$")
    uploadTensor: list[float] | None = None
    uploadShape: list[int] | None = None
class ArgoProfileOut(BaseModel):
    id: str
    lat: float
    lon: float
    row: int
    col: int
    truth: list[float]
    observed: list[float]
    salinity: list[float]
class MetricsOut(BaseModel):
    rmse: float
    bias: float
    r2: float
    thermoErr: float
    uohc: float
    mse: float
    lStab: float
    lThermal: float
    total: float
    missingPct: float
    surfaceTemp: float
    thermoDepth: float
class IngestOut(BaseModel):
    id: str
    missingPct: float
class SourceUseOut(BaseModel):
    id: str
    mode: str
    note: str
class SurfaceOut(BaseModel):
    sst: list[float]
    sss: list[float]
    ssh: list[float]
    curU: list[float]
    curV: list[float]
    windU: list[float]
    windV: list[float]
    land: list[int]
    gap: list[int]
class ReconOut(BaseModel):
    region: str
    date: str
    depths: list[float]
    h: int
    w: int
    metrics: MetricsOut
    profiles: list[ArgoProfileOut]
    surface: SurfaceOut
    truthVolume: list[float]
    reconVolume: list[float]
    salVolume: list[float]
    ingest: list[IngestOut]
    provenance: str
    synthetic: bool
    untrained: bool
    observed: list[str] = []
    sourceStatus: list[SourceUseOut] = []
    engineMode: str
    gapMethod: str
    version: str
    timingMs: float
class RegionOut(BaseModel):
    id: str
    label: str
    latMin: float
    latMax: float
    lonMin: float
    lonMax: float
class HealthOut(BaseModel):
    ok: bool
    version: str
    engines: list[str]
    liveConfigured: bool
    missingVars: list[str]
    optionalVars: list[str] = []
    argoOpenAccess: bool = True
    mode: str
class SourceStatusOut(BaseModel):
    id: str
    variable: str
    resolution: str
    org: str
    role: str
    status: str
    latencyMs: float | None = None
    missingPct: float | None = None
class ProfileOut(BaseModel):
    id: str
    lat: float
    lon: float
    truth: list[float]
    observed: list[float]
class SourceOut(BaseModel):
    id: str
    variable: str
    resolution: str
    org: str
    role: str
class ErrorOut(BaseModel):
    ok: bool = False
    code: str
    message: str
    missing: list[str] | None = None
