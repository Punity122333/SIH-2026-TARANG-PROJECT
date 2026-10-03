import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { runDemoSync } from "@/engine/demo/engine";
import { syncUrl } from "@/lib/offline";
import { DEPTH_LEVELS } from "@/lib/config";
describe("property metrics ordering", () => {
  it("rmse invariant to point ordering", () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(fc.float({ noNaN: true, min: -5, max: 35 }), fc.float({ noNaN: true, min: -5, max: 35 })), { minLength: 1, maxLength: 20 }), (pairs) => {
        const hand = (xs: [number, number][]): number => {
          let s = 0;
          for (const [p, t] of xs) s += (p - t) * (p - t);
          return Math.sqrt(s / xs.length);
        };
        const a = hand(pairs);
        const rev = hand([...pairs].reverse());
        expect(a).toBeCloseTo(rev, 12);
      }),
      { seed: 20260715, numRuns: 60 }
    );
  });
});
describe("property engine determinism", () => {
  it("any valid input reproduces exactly", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("bob", "arabian", "indian", "custom"),
        fc.constantFrom("2024-01-15", "2024-04-15", "2024-07-15", "2024-10-15"),
        fc.constantFrom("swin-monotonic-oi", "resnet-monotonic-oi", "swin-mlp-oi", "swin-monotonic-bilinear", "map-2d-only"),
        (region, date, mode) => {
          const mk = () => ({
            region: region as "bob",
            date,
            layers: { sst: true, sss: true, ssh: true, currents: true, winds: true },
            physics: { lambda1: 0.8, lambda2: 0.4, stabOn: true, thermalOn: true, monotonic: true },
            engineMode: mode,
            gapMethod: "oi"
          });
          const a = runDemoSync(mk());
          const b = runDemoSync(mk());
          expect(a.metrics.rmse).toBe(b.metrics.rmse);
          expect(a.reconVolume[1000]).toBe(b.reconVolume[1000]);
        }
      ),
      { seed: 20260715, numRuns: 20 }
    );
  });
});
describe("property url round trip", () => {
  it("encode then decode equals original", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("bob", "arabian", "indian", "custom"),
        fc.constantFrom("2024-01-15", "2024-07-15", "2025-01-15"),
        fc.integer({ min: 0, max: 14 }),
        fc.constantFrom("demo", "onnx", "remote"),
        (region, date, depth, engine) => {
          const q = new URLSearchParams({ region, date, depth: String(depth), engine });
          const back = {
            region: q.get("region"),
            date: q.get("date"),
            depth: q.get("depth"),
            engine: q.get("engine")
          };
          expect(back.region).toBe(region);
          expect(back.date).toBe(date);
          expect(back.depth).toBe(String(depth));
          expect(back.engine).toBe(engine);
          expect(DEPTH_LEVELS[Number(back.depth)]).toBe(DEPTH_LEVELS[depth]);
          expect(typeof syncUrl).toBe("function");
        }
      ),
      { seed: 20260715, numRuns: 40 }
    );
  });
});
describe("property decoder constraint", () => {
  it("monotonic output never increases with depth", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 3 }), (pick) => {
        const regions = ["bob", "arabian", "indian", "custom"] as const;
        const r = runDemoSync({
          region: regions[pick % 4],
          date: "2024-07-15",
          layers: { sst: true, sss: true, ssh: true, currents: true, winds: true },
          physics: { lambda1: 0.8, lambda2: 0.4, stabOn: true, thermalOn: true, monotonic: true },
          engineMode: "swin-monotonic-oi",
          gapMethod: "oi"
        });
        const i = 61 * r.w + 119;
        if (r.surface.land[i] === 1) return;
        for (let k = 1; k < 15; k++) {
          const prev = r.reconVolume[(k - 1) * r.h * r.w + i];
          const cur = r.reconVolume[k * r.h * r.w + i];
          expect(cur <= prev + 1e-9).toBe(true);
        }
      }),
      { seed: 20260715, numRuns: 20 }
    );
  });
});
