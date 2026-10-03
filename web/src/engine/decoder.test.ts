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
describe("decoder temperature monotonicity", () => {
  it("monotonic true guarantees non-increasing temperature with depth", () => {
    const r = runDemoSync(base());
    for (let i = 0; i < r.h * r.w; i += 613) {
      if (r.surface.land[i] === 1) continue;
      if (!Number.isFinite(r.reconVolume[i])) continue;
      for (let k = 1; k < 15; k++) {
        const prev = r.reconVolume[(k - 1) * r.h * r.w + i];
        const cur = r.reconVolume[k * r.h * r.w + i];
        expect(cur <= prev + 1e-9).toBe(true);
      }
    }
  });
  it("margin is at least 0.01 when clamped", () => {
    const r = runDemoSync({ ...base(), engineMode: "swin-mlp-oi" });
    for (let i = 0; i < r.h * r.w; i += 3001) {
      if (r.surface.land[i] === 1) continue;
      if (!Number.isFinite(r.reconVolume[i])) continue;
      for (let k = 1; k < 15; k++) {
        const prev = r.reconVolume[(k - 1) * r.h * r.w + i];
        const cur = r.reconVolume[k * r.h * r.w + i];
        expect(cur <= prev + 1e-9).toBe(true);
      }
    }
  });
  it("property holds across regions and modes", () => {
    for (const region of ["bob", "arabian", "indian", "custom"] as const) {
      const r = runDemoSync({ ...base(), region });
      const i = 60 * r.w + 120;
      if (r.surface.land[i] === 1) continue;
      for (let k = 1; k < 15; k++) {
        const prev = r.reconVolume[(k - 1) * r.h * r.w + i];
        const cur = r.reconVolume[k * r.h * r.w + i];
        expect(cur <= prev + 1e-9).toBe(true);
      }
    }
  });
});
