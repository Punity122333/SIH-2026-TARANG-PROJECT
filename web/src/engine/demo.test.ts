import { describe, expect, it } from "vitest";
import { runDemoSync, thermoDepthOf } from "@/engine/demo/engine";
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
describe("deterministic engine", () => {
  it("same inputs give same output", () => {
    const a = runDemoSync(base());
    const b = runDemoSync(base());
    expect(a.metrics.rmse).toBe(b.metrics.rmse);
    expect(a.metrics.thermoErr).toBe(b.metrics.thermoErr);
    expect(Array.from(a.reconVolume.slice(0, 50))).toEqual(Array.from(b.reconVolume.slice(0, 50)));
  });
  it("disabling SSH hurts thermocline most", () => {
    const full = runDemoSync(base());
    const noSsh = runDemoSync({ ...base(), layers: { ...base().layers, ssh: false } });
    expect(noSsh.metrics.thermoErr).toBeGreaterThanOrEqual(full.metrics.thermoErr);
  });
  it("mlp mode raises error and inversions when monotonic off", () => {
    const mlp = runDemoSync({ ...base(), engineMode: "swin-mlp-oi", physics: { ...base().physics, monotonic: false } });
    const good = runDemoSync(base());
    expect(mlp.metrics.rmse).toBeGreaterThanOrEqual(good.metrics.rmse * 0.9);
    expect(mlp.metrics.lStab).toBeGreaterThanOrEqual(0);
  });
  it("tensor shape is 7x120x240 concept", () => {
    const r = runDemoSync(base());
    expect(r.h).toBe(120);
    expect(r.w).toBe(240);
    expect(r.depths.length).toBe(15);
  });
  it("thermocline depth finder tracks max gradient", () => {
    const d = [0, 10, 25, 50, 75, 100, 150, 200];
    const p = [28, 27.8, 27.5, 26, 22, 18, 12, 8];
    expect(thermoDepthOf(p, d)).toBeGreaterThan(50);
  });
});
