import type { RegionId } from "@/lib/config";
export interface LayerToggles {
  sst: boolean;
  sss: boolean;
  ssh: boolean;
  currents: boolean;
  winds: boolean;
}
export interface PhysicsConfig {
  lambda1: number;
  lambda2: number;
  stabOn: boolean;
  thermalOn: boolean;
  monotonic: boolean;
}
export interface EngineInput {
  region: RegionId;
  date: string;
  layers: LayerToggles;
  physics: PhysicsConfig;
  engineMode: string;
  gapMethod: string;
  dataMode?: string;
}
export interface InputProvenance {
  synthetic: boolean;
  source: string;
}
export interface Provenance {
  inputs: {
    sst: InputProvenance;
    sss: InputProvenance;
    ssh: InputProvenance;
    currents: InputProvenance;
    winds: InputProvenance;
  };
  argo: {
    synthetic: boolean;
    source: string;
  };
  model: {
    trained: boolean;
    label: string;
  };
  metricRef: {
    heldOutArgo: boolean;
    label: string;
  };
}
export interface ArgoFloat {
  id: string;
  lat: number;
  lon: number;
  row: number;
  col: number;
  truth: number[];
  observed: number[];
  salinity: number[];
}
export interface Metrics {
  rmse: number;
  bias: number;
  r2: number;
  thermoErr: number;
  uohc: number;
  mse: number;
  lStab: number;
  lThermal: number;
  total: number;
  missingPct: number;
  surfaceTemp: number;
  thermoDepth: number;
}
export interface RunResult {
  input: EngineInput;
  depths: number[];
  surface: {
    sst: Float32Array;
    sss: Float32Array;
    ssh: Float32Array;
    curU: Float32Array;
    curV: Float32Array;
    windU: Float32Array;
    windV: Float32Array;
    land: Uint8Array;
    gap: Uint8Array;
  };
  truthVolume: Float32Array;
  reconVolume: Float32Array;
  salVolume: Float32Array;
  h: number;
  w: number;
  argo: ArgoFloat[];
  metrics: Metrics;
  ingest: { id: string; missingPct: number }[];
  timingMs: number;
  tes: { t: number[]; s: number[] } | null;
  provenance: string;
  prov: Provenance;
  synthetic: boolean;
  untrained: boolean;
  engineId: string;
  version: string;
}
export interface ReconstructionEngine {
  id: string;
  run(input: EngineInput): Promise<RunResult>;
}
export type EngineId = "demo" | "onnx" | "remote";
