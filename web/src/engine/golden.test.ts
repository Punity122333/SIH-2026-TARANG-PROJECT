import { describe, expect, it } from "vitest";
import { runDemoSync } from "@/engine/demo/engine";
import golden from "@/engine/golden.json";
describe("golden reference bob 2024-07-15", () => {
  it("reproduces stored metrics within tolerance", () => {
    const r = runDemoSync({
      region: "bob",
      date: "2024-07-15",
      layers: { sst: true, sss: true, ssh: true, currents: true, winds: true },
      physics: { lambda1: 0.8, lambda2: 0.4, stabOn: true, thermalOn: true, monotonic: true },
      engineMode: "swin-monotonic-oi",
      gapMethod: "oi"
    });
    const g = golden as unknown as { metrics: Record<string, number>; depths: number[]; reconSample: number[]; midRecon: number[] };
    for (const k of Object.keys(g.metrics)) {
      expect(r.metrics[k as keyof typeof r.metrics]).toBeCloseTo(g.metrics[k], 6);
    }
    expect(r.depths).toEqual(g.depths);
    for (let i = 0; i < g.reconSample.length; i++) {
      expect(r.reconVolume[50000 + i]).toBeCloseTo(g.reconSample[i], 5);
    }
    for (let k = 0; k < 15; k++) {
      expect(r.reconVolume[k * r.h * r.w + 60 * r.w + 120]).toBeCloseTo(g.midRecon[k], 5);
    }
  });
});
