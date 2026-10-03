import { describe, expect, it } from "vitest";
import { runDemoSync } from "@/engine/demo/engine";
import { profileCsv, fieldCsv, fieldNetcdf } from "@/lib/export";
import { detectVars, defaultMapping, validateMapping } from "@/lib/ingest";
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
describe("export", () => {
  it("profile csv has 15 rows plus header", () => {
    const r = runDemoSync(base());
    const out = profileCsv(r, 60, 120, "bob", "2024-07-15");
    const lines = out.text.split("\n");
    expect(lines[0]).toBe("depth_m,temp_recon_c,temp_truth_c,sal_psu");
    expect(lines.length).toBe(16);
    expect(out.name).toContain("bob");
  });
  it("field csv and netcdf carry provenance", () => {
    const r = runDemoSync(base());
    const c = fieldCsv(r, 3, "bob", "2024-07-15");
    expect(c.text.split("\n").length).toBeGreaterThan(10);
    const n = fieldNetcdf(r, "bob", "2024-07-15", 3);
    const t = new TextDecoder().decode(n.bytes);
    expect(t).toContain("netcdf");
    expect(t).toContain(r.provenance);
    expect(n.name.endsWith(".nc")).toBe(true);
  });
});
describe("ingest detect", () => {
  it("detects sst sss ssh kinds", () => {
    const v = detectVars(["thetao", "so", "zos", "uo"]);
    const m = defaultMapping(v);
    expect(m["SST"]).toBe("thetao");
    expect(validateMapping({ SST: "a", SSS: "b", SSH: "c" }).valid).toBe(true);
    expect(validateMapping({ SST: "a" }).valid).toBe(false);
  });
});
