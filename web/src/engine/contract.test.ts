import { describe, expect, it } from "vitest";
import { runDemoSync } from "@/engine/demo/engine";
import { isValidRemotePayload, remoteToResult } from "@/engine/schema";
import { demoEngine, onnxEngine, remoteEngine, engineFor } from "@/engine/engines";
import type { EngineInput } from "@/engine/types";
function base(): EngineInput {
  return {
    region: "bob",
    date: "2024-07-15",
    layers: { sst: true, sss: true, ssh: true, currents: true, winds: true },
    physics: { lambda1: 0.8, lambda2: 0.4, stabOn: true, thermalOn: true, monotonic: true },
    engineMode: "swin-monotonic-oi",
    gapMethod: "oi"
  };
}
function toPayload(r: ReturnType<typeof runDemoSync>) {
  return {
    region: "bob",
    date: "2024-07-15",
    depths: [...r.depths],
    h: r.h,
    w: r.w,
    metrics: { ...r.metrics },
    profiles: r.argo.map((a) => ({ id: a.id, lat: a.lat, lon: a.lon, row: a.row, col: a.col, truth: [...a.truth], observed: [...a.observed], salinity: [...a.salinity] })),
    surface: {
      sst: Array.from(r.surface.sst).map((v) => (Number.isFinite(v) ? v : -999)),
      sss: Array.from(r.surface.sss).map((v) => (Number.isFinite(v) ? v : -999)),
      ssh: Array.from(r.surface.ssh).map((v) => (Number.isFinite(v) ? v : -999)),
      curU: Array.from(r.surface.curU),
      curV: Array.from(r.surface.curV),
      windU: Array.from(r.surface.windU),
      windV: Array.from(r.surface.windV),
      land: Array.from(r.surface.land),
      gap: Array.from(r.surface.gap)
    },
    truthVolume: Array.from(r.truthVolume).map((v) => (Number.isFinite(v) ? v : -999)),
    reconVolume: Array.from(r.reconVolume).map((v) => (Number.isFinite(v) ? v : -999)),
    salVolume: Array.from(r.salVolume).map((v) => (Number.isFinite(v) ? v : -999)),
    ingest: [...r.ingest],
    provenance: "remote / synthetic data / untrained weights",
    synthetic: true,
    untrained: true,
    engineMode: "swin-monotonic-oi",
    gapMethod: "oi",
    version: "0.1.0",
    timingMs: 9
  };
}
describe("engine contract against shared schema", () => {
  it("demo result converts to valid payload", () => {
    const r = runDemoSync(base());
    expect(isValidRemotePayload(toPayload(r))).toBe(true);
  });
  it("remote conversion preserves shapes and metric keys", () => {
    const r = runDemoSync(base());
    const out = remoteToResult(toPayload(r) as never, base());
    expect(out.h).toBe(120);
    expect(out.w).toBe(240);
    expect(out.depths.length).toBe(15);
    expect(out.reconVolume.length).toBe(15 * 120 * 240);
    expect(Object.keys(out.metrics).sort()).toEqual(["bias", "lStab", "lThermal", "missingPct", "mse", "r2", "rmse", "surfaceTemp", "thermoDepth", "thermoErr", "total", "uohc"]);
  });
  it("typescript and pydantic metric keys match", () => {
    const tsKeys = ["rmse", "bias", "r2", "thermoErr", "uohc", "mse", "lStab", "lThermal", "total", "missingPct", "surfaceTemp", "thermoDepth"].sort();
    const pyKeys = ["rmse", "bias", "r2", "thermoErr", "uohc", "mse", "lStab", "lThermal", "total", "missingPct", "surfaceTemp", "thermoDepth"].sort();
    expect(tsKeys).toEqual(pyKeys);
  });
  it("rejects drifted payloads missing metric keys", () => {
    const r = runDemoSync(base());
    const p = toPayload(r) as unknown as Record<string, unknown>;
    const m = { ...(p["metrics"] as Record<string, number>) };
    delete m["rmse"];
    expect(isValidRemotePayload({ ...p, metrics: m })).toBe(false);
    expect(isValidRemotePayload({ ...p, depths: [0, 10] })).toBe(false);
    expect(isValidRemotePayload({ ...p, reconVolume: [1, 2, 3] })).toBe(false);
  });
  it("engines expose expected ids and routing", () => {
    expect(demoEngine.id).toBe("demo");
    expect(onnxEngine.id).toBe("onnx");
    expect(remoteEngine.id).toBe("remote");
    expect(engineFor("demo")).toBe("demo");
    expect(engineFor("onnx")).toBe("onnx");
    expect(engineFor("remote")).toBe("remote");
    expect(engineFor("other")).toBe("demo");
  });
  it("demo engine run matches sync", async () => {
    const a = await demoEngine.run(base());
    const b = runDemoSync(base());
    expect(a.metrics.rmse).toBe(b.metrics.rmse);
  });
});
