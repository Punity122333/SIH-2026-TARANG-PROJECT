import { describe, expect, it } from "vitest";
import { runDemoSync } from "@/engine/demo/engine";
import { isValidRemotePayload, remoteToResult } from "@/engine/schema";
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
function fakePayload() {
  const r = runDemoSync(base());
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
    timingMs: 12
  };
}
describe("shared result schema", () => {
  it("accepts a valid remote payload", () => {
    expect(isValidRemotePayload(fakePayload())).toBe(true);
  });
  it("rejects a broken payload", () => {
    expect(isValidRemotePayload({ region: "bob" })).toBe(false);
  });
  it("converts remote payload to identical render shape", () => {
    const p = fakePayload();
    const out = remoteToResult(p as never, base());
    expect(out.h).toBe(120);
    expect(out.w).toBe(240);
    expect(out.depths.length).toBe(15);
    expect(out.argo.length).toBeGreaterThan(0);
    expect(out.surface.sst.length).toBe(120 * 240);
    expect(out.reconVolume.length).toBe(15 * 120 * 240);
    expect(out.provenance).toBe("remote / synthetic data / untrained weights");
  });
  it("demo and remote share labels and shapes", () => {
    const demo = runDemoSync(base());
    const remote = remoteToResult(fakePayload() as never, base());
    expect(Object.keys(demo.metrics).sort()).toEqual(Object.keys(remote.metrics).sort());
    expect(demo.depths).toEqual(remote.depths);
    expect(demo.h).toBe(remote.h);
  });
});
