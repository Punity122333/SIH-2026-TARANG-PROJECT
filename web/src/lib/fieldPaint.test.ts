import { describe, expect, it } from "vitest";
import { runDemoSync } from "@/engine/demo/engine";
import type { EngineInput } from "@/engine/types";
import { LAND_RGB, EDGE_BLEND, mix, adjacentToLand, paintCell } from "@/lib/fieldPaint";
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
describe("field paint edges", () => {
  it("land cells are opaque land fill, never transparent", () => {
    const c = paintCell(NaN, true, false, 20, 30);
    expect(c).toEqual([LAND_RGB[0], LAND_RGB[1], LAND_RGB[2], 255]);
    const masked = paintCell(25.5, true, false, 20, 30);
    expect(masked[3]).toBe(255);
  });
  it("nonfinite ocean values fall back to land fill", () => {
    const c = paintCell(NaN, false, false, 20, 30);
    expect(c[3]).toBe(255);
  });
  it("interior ocean keeps data color fully opaque", () => {
    const c = paintCell(25.0, false, false, 20, 30);
    expect(c[3]).toBe(255);
    expect(c[0]).not.toBe(LAND_RGB[0]);
  });
  it("edge ocean cells blend toward land fill", () => {
    const plain = paintCell(25.0, false, false, 20, 30);
    const edge = paintCell(25.0, false, true, 20, 30);
    expect(edge[3]).toBe(255);
    for (const k of [0, 1, 2]) {
      expect(edge[k]).toBe(mix(plain[k], LAND_RGB[k], EDGE_BLEND));
    }
  });
  it("adjacency detects four neighbours only", () => {
    const land = new Uint8Array([0, 0, 0, 0, 1, 0, 0, 0, 0]);
    expect(adjacentToLand(land, 3, 3, 0, 1)).toBe(true);
    expect(adjacentToLand(land, 3, 3, 2, 1)).toBe(true);
    expect(adjacentToLand(land, 3, 3, 1, 0)).toBe(true);
    expect(adjacentToLand(land, 3, 3, 1, 2)).toBe(true);
    expect(adjacentToLand(land, 3, 3, 0, 0)).toBe(false);
    expect(adjacentToLand(land, 3, 3, 2, 2)).toBe(false);
  });
  it("bob top rows are land and first ocean row is valid", () => {
    const r = runDemoSync(base());
    for (let c = 0; c < r.w; c++) expect(r.surface.land[c]).toBe(1);
    let firstOcean = -1;
    for (let row = 0; row < r.h; row++) {
      if (r.surface.land[row * r.w + 60] === 0) {
        firstOcean = row;
        break;
      }
    }
    expect(firstOcean).toBeGreaterThan(0);
    expect(Number.isFinite(r.surface.sst[firstOcean * r.w + 60])).toBe(true);
    expect(Number.isFinite(r.surface.sst[(firstOcean - 1) * r.w + 60])).toBe(false);
  });
  it("mask stays binary at grid resolution", () => {
    const r = runDemoSync(base());
    for (let i = 0; i < r.h * r.w; i += 131) {
      expect(r.surface.land[i] === 0 || r.surface.land[i] === 1).toBe(true);
    }
    expect(r.h).toBe(120);
    expect(r.w).toBe(240);
  });
});
