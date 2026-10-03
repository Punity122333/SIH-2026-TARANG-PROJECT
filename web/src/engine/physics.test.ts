import { describe, expect, it } from "vitest";
import { runDemoSync } from "@/engine/demo/engine";
import { DEPTH_LEVELS } from "@/lib/config";
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
function stabOf(profile: number[], depths: number[]): number {
  let s = 0;
  let n = 0;
  for (let k = 1; k < profile.length; k++) {
    const g = (profile[k] - profile[k - 1]) / (depths[k] - depths[k - 1]);
    if (g > 0) s += g * g;
    n++;
  }
  return n > 0 ? s / n : 0;
}
describe("physics losses", () => {
  it("L_stab matches hand formula on built profiles", () => {
    const depths = [0, 50, 100, 200];
    expect(stabOf([28, 27, 20, 10], depths)).toBe(0);
    const bad = stabOf([28, 29, 20, 10], depths);
    expect(bad).toBeGreaterThan(0);
    expect(bad).toBeCloseTo(((1 / 50) * (1 / 50)) / 3, 12);
  });
  it("engine lStab matches recomputation on argo cells", () => {
    const r = runDemoSync(base());
    let s = 0;
    let n = 0;
    for (const fl of r.argo) {
      const idx = fl.row * r.w + fl.col;
      const prof: number[] = [];
      for (let k = 0; k < 15; k++) prof.push(r.reconVolume[k * r.h * r.w + idx]);
      for (let k = 1; k < 15; k++) {
        const g = (prof[k] - prof[k - 1]) / (DEPTH_LEVELS[k] - DEPTH_LEVELS[k - 1]);
        if (g > 0) s += g * g;
        n++;
      }
    }
    expect(r.metrics.lStab).toBeCloseTo(s / n, 12);
  });
  it("total equals mse plus weighted losses", () => {
    const r = runDemoSync(base());
    const m = r.metrics;
    expect(m.total).toBeCloseTo(m.mse + 0.8 * m.lStab + 0.4 * m.lThermal, 10);
  });
  it("disabling stability switch zeroes its weight", () => {
    const off = runDemoSync({ ...base(), physics: { ...base().physics, stabOn: false, thermalOn: false } });
    expect(off.metrics.total).toBeCloseTo(off.metrics.mse, 10);
  });
  it("raising lambda1 never increases stability term", () => {
    const lo = runDemoSync({ ...base(), physics: { ...base().physics, lambda1: 0.2 } });
    const hi = runDemoSync({ ...base(), physics: { ...base().physics, lambda1: 2.5 } });
    expect(hi.metrics.lStab).toBeLessThanOrEqual(lo.metrics.lStab + 1e-9);
  });
  it("thermal term follows ssh and lambda2 form", () => {
    const a = runDemoSync(base());
    const noSsh = runDemoSync({ ...base(), layers: { ...base().layers, ssh: false } });
    expect(noSsh.metrics.lThermal).toBeGreaterThanOrEqual(a.metrics.lThermal);
    const hi = runDemoSync({ ...base(), physics: { ...base().physics, lambda2: 3 } });
    expect(hi.metrics.lThermal).toBeGreaterThanOrEqual(a.metrics.lThermal);
  });
});
