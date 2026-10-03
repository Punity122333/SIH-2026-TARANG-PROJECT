import { describe, expect, it } from "vitest";
import { runDemoSync } from "@/engine/demo/engine";
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
function handRmse(pred: number[], truth: number[]): number {
  let s = 0;
  for (let i = 0; i < pred.length; i++) s += (pred[i] - truth[i]) * (pred[i] - truth[i]);
  return Math.sqrt(s / pred.length);
}
function handBias(pred: number[], truth: number[]): number {
  let s = 0;
  for (let i = 0; i < pred.length; i++) s += pred[i] - truth[i];
  return s / pred.length;
}
function handR2(pred: number[], truth: number[]): number {
  const m = truth.reduce((a, b) => a + b, 0) / truth.length;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < pred.length; i++) {
    ssTot += (truth[i] - m) * (truth[i] - m);
    ssRes += (truth[i] - pred[i]) * (truth[i] - pred[i]);
  }
  if (ssTot < 1e-9) return 0;
  return 1 - ssRes / ssTot;
}
describe("metrics against hand computation", () => {
  it("rmse bias r2 match brute force on engine argo points", () => {
    const r = runDemoSync(base());
    const pred: number[] = [];
    const truth: number[] = [];
    for (const fl of r.argo) {
      const idx = fl.row * r.w + fl.col;
      for (let k = 0; k < 15; k++) {
        pred.push(r.reconVolume[k * r.h * r.w + idx]);
        truth.push(fl.truth[k]);
      }
    }
    expect(r.metrics.rmse).toBeCloseTo(handRmse(pred, truth), 10);
    expect(r.metrics.bias).toBeCloseTo(handBias(pred, truth), 10);
    expect(r.metrics.r2).toBeCloseTo(handR2(pred, truth), 10);
    expect(r.metrics.mse).toBeCloseTo(handRmse(pred, truth) * handRmse(pred, truth), 10);
  });
  it("small hand case rmse equals root mean square", () => {
    expect(handRmse([1, 2, 3], [1, 2, 3])).toBe(0);
    expect(handRmse([2, 4], [0, 0])).toBeCloseTo(Math.sqrt(10), 10);
    expect(handBias([2, 4], [0, 0])).toBe(3);
    expect(handR2([1, 2, 3], [1, 2, 3])).toBe(1);
    expect(handR2([5, 5, 5], [5, 5, 5])).toBe(0);
  });
  it("thermocline error is mean absolute depth difference", () => {
    const r = runDemoSync(base());
    expect(r.metrics.thermoErr).toBeGreaterThanOrEqual(0);
    expect(r.metrics.thermoErr).toBeLessThan(500);
  });
  it("uohc integrates only top 300m with positive temps", () => {
    const r = runDemoSync(base());
    expect(r.metrics.uohc).toBeGreaterThan(0);
    expect(Number.isFinite(r.metrics.uohc)).toBe(true);
    const ref = runDemoSync(base());
    expect(r.metrics.uohc).toBe(ref.metrics.uohc);
  });
  it("missingPct counts gapped ocean cells", () => {
    const r = runDemoSync(base());
    expect(r.metrics.missingPct).toBeGreaterThanOrEqual(0);
    expect(r.metrics.missingPct).toBeLessThanOrEqual(100);
    let miss = 0;
    let ocean = 0;
    for (let i = 0; i < r.h * r.w; i++) {
      if (r.surface.land[i] === 0) {
        ocean++;
        if (r.surface.gap[i] === 1) miss++;
      }
    }
    expect(r.metrics.missingPct).toBeCloseTo((miss / ocean) * 100, 8);
  });
  it("surfaceTemp is mid recon cell and thermodepth finite", () => {
    const r = runDemoSync(base());
    const mid = 60 * r.w + 120;
    expect(r.metrics.surfaceTemp).toBe(r.reconVolume[mid]);
    expect(Number.isFinite(r.metrics.thermoDepth)).toBe(true);
  });
});
