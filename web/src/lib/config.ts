export const DEPTH_LEVELS = [0, 10, 25, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 750, 1000];
export const GRID_H = 120;
export const GRID_W = 240;
export const GRID_RES = 0.25;
export const WINDOW_T = 7;
export const CHANNEL_COUNT = 7;
export const CHANNEL_NAMES = ["SST", "SSS", "SSH", "CUR_U", "CUR_V", "WIND_U", "WIND_V"];
export const THERMO_TOP = 50;
export const THERMO_BOTTOM = 300;
export const STABILITY_THRESHOLD = 0.02;
export type RegionId = "bob" | "arabian" | "indian" | "custom";
export interface RegionDef {
  id: RegionId;
  label: string;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}
export const REGIONS: RegionDef[] = [
  { id: "bob", label: "Bay of Bengal", latMin: 5, latMax: 22, lonMin: 80, lonMax: 95 },
  { id: "arabian", label: "Arabian Sea", latMin: 5, latMax: 22, lonMin: 60, lonMax: 75 },
  { id: "indian", label: "Indian Ocean", latMin: -5, latMax: 25, lonMin: 55, lonMax: 95 },
  { id: "custom", label: "Custom", latMin: 5, latMax: 20, lonMin: 65, lonMax: 90 }
];
export const SOURCES = [
  { id: "OSTIA", variable: "SST", resolution: "0.05°", org: "Copernicus", role: "Surface input" },
  { id: "SMAP / SMOS", variable: "SSS", resolution: "0.125°", org: "Copernicus", role: "Surface input" },
  { id: "DUACS", variable: "SSH / SLA", resolution: "0.25°", org: "Copernicus", role: "Surface input; guides gap filling" },
  { id: "OSCAR", variable: "Surface currents", resolution: "Not specified", org: "PODAAC", role: "Surface input" },
  { id: "CCMP", variable: "Winds", resolution: "Not specified", org: "PODAAC", role: "Surface input" },
  { id: "GLORYS12v2", variable: "Reanalysis", resolution: "Not specified", org: "Copernicus", role: "Training target" },
  { id: "ARGO", variable: "Profiles via Coriolis GDAC open access", resolution: "Not specified", org: "Coriolis", role: "Independent held-out validation, never trained on" }
];
export const ENGINE_MODES = [
  { id: "swin-monotonic-oi", label: "Swin-T + ConvLSTM · Monotonic Spline · OI" },
  { id: "resnet-monotonic-oi", label: "ResNet-18 + 2D Conv · Monotonic Spline · OI" },
  { id: "swin-mlp-oi", label: "Swin-T + ConvLSTM · Standard MLP · OI" },
  { id: "swin-monotonic-bilinear", label: "Swin-T + ConvLSTM · Monotonic Spline · Bilinear" },
  { id: "map-2d-only", label: "2D map-only view" }
];
export const GAP_METHODS = [
  { id: "oi", label: "Optimal Interpolation" },
  { id: "gp", label: "Gaussian Process" },
  { id: "ssh", label: "SSH-guided" },
  { id: "bilinear", label: "Bilinear (fallback)" }
];
export const ENGINES = [
  { id: "demo", label: "Demo (browser)" },
  { id: "onnx", label: "ONNX (browser)" },
  { id: "remote", label: "Remote (backend)" }
];
export const DATA_MODES = [
  { id: "demo", label: "Demo" },
  { id: "live", label: "Live" }
];
export const AVAILABLE_DATES = ["2024-01-15", "2024-04-15", "2024-07-15", "2024-10-15", "2025-01-15"];
export const API_VERSION = "0.1.0";
