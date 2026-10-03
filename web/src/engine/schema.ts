import type { RunResult, EngineInput, ArgoFloat } from "@/engine/types";
export interface RemotePayload {
  region: string;
  date: string;
  depths: number[];
  h: number;
  w: number;
  metrics: Record<string, number>;
  profiles: { id: string; lat: number; lon: number; row: number; col: number; truth: number[]; observed: number[]; salinity: number[] }[];
  surface: { sst: number[]; sss: number[]; ssh: number[]; curU: number[]; curV: number[]; windU: number[]; windV: number[]; land: number[]; gap: number[] };
  truthVolume: number[];
  reconVolume: number[];
  salVolume: number[];
  ingest: { id: string; missingPct: number }[];
  provenance: string;
  synthetic: boolean;
  untrained: boolean;
  engineMode: string;
  gapMethod: string;
  version: string;
  timingMs: number;
}
export function isValidRemotePayload(p: unknown): p is RemotePayload {
  if (typeof p !== "object" || p === null) return false;
  const o = p as Record<string, unknown>;
  if (typeof o["region"] !== "string") return false;
  if (typeof o["date"] !== "string") return false;
  if (!Array.isArray(o["depths"]) || (o["depths"] as unknown[]).length !== 15) return false;
  if (typeof o["h"] !== "number" || typeof o["w"] !== "number") return false;
  if (typeof o["metrics"] !== "object" || o["metrics"] === null) return false;
  const m = o["metrics"] as Record<string, unknown>;
  const keys = ["rmse", "bias", "r2", "thermoErr", "uohc", "mse", "lStab", "lThermal", "total", "missingPct", "surfaceTemp", "thermoDepth"];
  for (const k of keys) if (typeof m[k] !== "number" || !Number.isFinite(m[k] as number)) return false;
  if (!Array.isArray(o["profiles"]) || (o["profiles"] as unknown[]).length === 0) return false;
  for (const pr of o["profiles"] as Record<string, unknown>[]) {
    if (typeof pr["id"] !== "string") return false;
    if (!Array.isArray(pr["truth"]) || (pr["truth"] as unknown[]).length !== 15) return false;
    if (!Array.isArray(pr["observed"]) || (pr["observed"] as unknown[]).length !== 15) return false;
    if (!Array.isArray(pr["salinity"]) || (pr["salinity"] as unknown[]).length !== 15) return false;
  }
  if (typeof o["surface"] !== "object" || o["surface"] === null) return false;
  const s = o["surface"] as Record<string, unknown>;
  for (const k of ["sst", "sss", "ssh", "curU", "curV", "windU", "windV", "land", "gap"]) {
    if (!Array.isArray(s[k])) return false;
    if ((s[k] as unknown[]).length !== 120 * 240) return false;
  }
  if (!Array.isArray(o["reconVolume"]) || (o["reconVolume"] as unknown[]).length !== 15 * 120 * 240) return false;
  if (!Array.isArray(o["truthVolume"]) || (o["truthVolume"] as unknown[]).length !== 15 * 120 * 240) return false;
  if (!Array.isArray(o["salVolume"]) || (o["salVolume"] as unknown[]).length !== 15 * 120 * 240) return false;
  if (typeof o["provenance"] !== "string") return false;
  if (typeof o["synthetic"] !== "boolean") return false;
  if (typeof o["untrained"] !== "boolean") return false;
  return true;
}
function toF32(arr: number[]): Float32Array {
  const out = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    out[i] = v === -999 ? NaN : v;
  }
  return out;
}
function toU8(arr: number[]): Uint8Array {
  const out = new Uint8Array(arr.length);
  for (let i = 0; i < arr.length; i++) out[i] = arr[i] ? 1 : 0;
  return out;
}
export function remoteToResult(p: RemotePayload, input: EngineInput): RunResult {
  const argo: ArgoFloat[] = p.profiles.map((x) => ({ id: x.id, lat: x.lat, lon: x.lon, row: x.row, col: x.col, truth: [...x.truth], observed: [...x.observed], salinity: [...x.salinity] }));
  const m = p.metrics;
  return {
    input,
    depths: [...p.depths],
    surface: {
      sst: toF32(p.surface.sst),
      sss: toF32(p.surface.sss),
      ssh: toF32(p.surface.ssh),
      curU: toF32(p.surface.curU),
      curV: toF32(p.surface.curV),
      windU: toF32(p.surface.windU),
      windV: toF32(p.surface.windV),
      land: toU8(p.surface.land),
      gap: toU8(p.surface.gap)
    },
    truthVolume: toF32(p.truthVolume),
    reconVolume: toF32(p.reconVolume),
    salVolume: toF32(p.salVolume),
    h: p.h,
    w: p.w,
    argo,
    metrics: { rmse: m["rmse"] as number, bias: m["bias"] as number, r2: m["r2"] as number, thermoErr: m["thermoErr"] as number, uohc: m["uohc"] as number, mse: m["mse"] as number, lStab: m["lStab"] as number, lThermal: m["lThermal"] as number, total: m["total"] as number, missingPct: m["missingPct"] as number, surfaceTemp: m["surfaceTemp"] as number, thermoDepth: m["thermoDepth"] as number },
    ingest: p.ingest.map((x) => ({ id: x.id, missingPct: x.missingPct })),
    timingMs: p.timingMs,
    tes: null,
    provenance: p.provenance,
    synthetic: p.synthetic,
    untrained: p.untrained,
    engineId: "remote",
    version: p.version
  };
}
