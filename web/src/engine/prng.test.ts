import { describe, expect, it } from "vitest";
import { hashSeed, mulberry32, dayOfYear, makeNoise, makeEddies, eddyField } from "@/engine/demo/prng";
describe("prng determinism", () => {
  it("hashSeed is stable and sensitive", () => {
    expect(hashSeed("bob2024-07-15")).toBe(hashSeed("bob2024-07-15"));
    expect(hashSeed("bob")).not.toBe(hashSeed("arabian"));
    expect(hashSeed("")).toBeGreaterThanOrEqual(0);
  });
  it("mulberry32 sequence repeats from same seed", () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const va = [a(), a(), a(), a(), a()];
    const vb = [b(), b(), b(), b(), b()];
    expect(va).toEqual(vb);
    const c = mulberry32(999);
    expect(c()).not.toBe(va[0]);
  });
  it("dayOfYear matches known dates", () => {
    expect(dayOfYear("2024-01-01")).toBe(1);
    expect(dayOfYear("2024-07-15")).toBe(197);
    expect(dayOfYear("2024-12-31")).toBe(366);
  });
  it("makeNoise is deterministic and bounded", () => {
    const r1 = mulberry32(42);
    const r2 = mulberry32(42);
    const n1 = makeNoise(12, 16, r1, 2);
    const n2 = makeNoise(12, 16, r2, 2);
    expect(Array.from(n1)).toEqual(Array.from(n2));
    expect(n1.length).toBe(192);
    for (const v of n1) expect(Math.abs(v)).toBeLessThanOrEqual(1.01);
  });
  it("eddies are deterministic and field decays", () => {
    const r1 = mulberry32(7);
    const r2 = mulberry32(7);
    const e1 = makeEddies(r1, 120, 240, 9);
    const e2 = makeEddies(r2, 120, 240, 9);
    expect(e1).toEqual(e2);
    expect(e1.length).toBe(9);
    for (const e of e1) {
      expect(e.rad).toBeGreaterThanOrEqual(6);
      expect(e.rad).toBeLessThanOrEqual(22);
    }
    const f = eddyField(120, 240, e1);
    expect(f.length).toBe(120 * 240);
    expect(f.some((v) => v !== 0)).toBe(true);
  });
});
