import { describe, expect, it } from "vitest";
import { runDemoSync, thermoDepthOf, profileAt } from "@/engine/demo/engine";
import { DEPTH_LEVELS, GRID_H, GRID_W } from "@/lib/config";
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
function hashVol(vol: Float32Array): number {
  let h = 2166136261;
  for (let i = 0; i < vol.length; i += 97) {
    const v = Number.isFinite(vol[i]) ? Math.round(vol[i] * 1000) : -999999;
    h = Math.imul(h ^ (v & 65535), 16777619);
    h = Math.imul(h ^ ((v >> 16) & 65535), 16777619);
  }
  return h >>> 0;
}
describe("demo engine determinism", () => {
  it("identical inputs give identical full volumes", () => {
    const a = runDemoSync(base());
    const b = runDemoSync(base());
    expect(hashVol(a.reconVolume)).toBe(hashVol(b.reconVolume));
    expect(hashVol(a.truthVolume)).toBe(hashVol(b.truthVolume));
    expect(hashVol(a.salVolume)).toBe(hashVol(b.salVolume));
    expect(a.metrics.rmse).toBe(b.metrics.rmse);
    expect(a.metrics.bias).toBe(b.metrics.bias);
    expect(a.metrics.r2).toBe(b.metrics.r2);
    expect(JSON.stringify(a.argo)).toBe(JSON.stringify(b.argo));
    expect(Array.from(a.surface.gap)).toEqual(Array.from(b.surface.gap));
  });
  it("different seeds regions dates change output", () => {
    const a = runDemoSync(base());
    const otherRegion = runDemoSync({ ...base(), region: "arabian" });
    expect(hashVol(otherRegion.reconVolume)).not.toBe(hashVol(a.reconVolume));
    const otherDate = runDemoSync({ ...base(), date: "2024-01-15" });
    expect(hashVol(otherDate.reconVolume)).not.toBe(hashVol(a.reconVolume));
    const otherMode = runDemoSync({ ...base(), engineMode: "map-2d-only" });
    expect(otherMode.metrics.rmse).not.toBe(a.metrics.rmse);
  });
  it("uses 15 depth levels with ordered axis", () => {
    const r = runDemoSync(base());
    expect(r.depths.length).toBe(15);
    expect(r.depths).toEqual(DEPTH_LEVELS);
    for (let k = 1; k < r.depths.length; k++) expect(r.depths[k]).toBeGreaterThan(r.depths[k - 1]);
    expect(r.h).toBe(GRID_H);
    expect(r.w).toBe(GRID_W);
    expect(r.reconVolume.length).toBe(15 * GRID_H * GRID_W);
  });
  it("profileAt slices exact cells", () => {
    const r = runDemoSync(base());
    const row = 60;
    const col = 120;
    const p = profileAt(r, row, col);
    expect(p.recon.length).toBe(15);
    expect(p.truth.length).toBe(15);
    expect(p.sal.length).toBe(15);
    for (let k = 0; k < 15; k++) {
      expect(p.recon[k]).toBe(r.reconVolume[k * r.h * r.w + row * r.w + col]);
      expect(p.truth[k]).toBe(r.truthVolume[k * r.h * r.w + row * r.w + col]);
    }
  });
  it("thermoDepthOf tracks strongest cooling gradient", () => {
    const d = [0, 10, 25, 50, 75, 100, 150, 200];
    const p = [28, 27.8, 27.5, 26, 22, 18, 12, 8];
    const td = thermoDepthOf(p, d);
    expect(td).toBeGreaterThanOrEqual(50);
    expect(td).toBeLessThanOrEqual(100);
    const flat = [20, 20, 20, 20, 20, 20, 20, 20];
    expect(Number.isFinite(thermoDepthOf(flat, d))).toBe(true);
  });
  it("monotonic mode enforces non-increasing temperature on ocean cells", () => {
    const r = runDemoSync(base());
    let checked = 0;
    for (let i = 0; i < r.h * r.w; i += 977) {
      if (r.surface.land[i] === 1) continue;
      if (!Number.isFinite(r.reconVolume[i])) continue;
      for (let k = 1; k < 15; k++) {
        const prev = r.reconVolume[(k - 1) * r.h * r.w + i];
        const cur = r.reconVolume[k * r.h * r.w + i];
        expect(cur).toBeLessThanOrEqual(prev + 1e-6);
      }
      checked++;
    }
    expect(checked).toBeGreaterThan(5);
  });
  it("monotonic off injects inversions", () => {
    const off = runDemoSync({ ...base(), physics: { ...base().physics, monotonic: false } });
    const on = runDemoSync(base());
    expect(off.metrics.lStab).toBeGreaterThanOrEqual(on.metrics.lStab);
  });
});
