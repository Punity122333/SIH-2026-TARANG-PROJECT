import { describe, expect, it } from "vitest";
import { runDemoSync } from "@/engine/demo/engine";
import { isValidRemotePayload, remoteToResult } from "@/engine/schema";
import type { EngineInput } from "@/engine/types";
import {
  demoProvenance,
  onnxProvenance,
  remoteProvenance,
  statusChip,
  provenanceLine,
  metricRefShort,
  showDemoBadge,
  showUntrainedNotice,
  inputSourceText,
  hasRealInputs
} from "@/lib/provenance";
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
function livePayload() {
  const r = runDemoSync(base());
  return {
    region: "bob",
    date: "2024-07-15",
    depths: [...r.depths],
    h: r.h,
    w: r.w,
    metrics: { ...r.metrics },
    profiles: r.argo.map((a) => ({ id: a.id, lat: a.lat, lon: a.lon, row: a.row, col: a.col, truth: [...a.truth], observed: [...a.observed], salinity: [...a.salinity] })),
    surface: {
      sst: Array.from(r.surface.sst).map((v) => (Number.isFinite(v) ? v : -999)),
      sss: Array.from(r.surface.sss).map((v) => (Number.isFinite(v) ? v : -999)),
      ssh: Array.from(r.surface.ssh).map((v) => (Number.isFinite(v) ? v : -999)),
      curU: Array.from(r.surface.curU),
      curV: Array.from(r.surface.curV),
      windU: Array.from(r.surface.windU),
      windV: Array.from(r.surface.windV),
      land: Array.from(r.surface.land),
      gap: Array.from(r.surface.gap)
    },
    truthVolume: Array.from(r.truthVolume).map((v) => (Number.isFinite(v) ? v : -999)),
    reconVolume: Array.from(r.reconVolume).map((v) => (Number.isFinite(v) ? v : -999)),
    salVolume: Array.from(r.salVolume).map((v) => (Number.isFinite(v) ? v : -999)),
    ingest: [...r.ingest],
    provenance: "remote / SST (OSTIA REP) / synthetic SSS / synthetic SSH / synthetic currents / synthetic winds / untrained weights",
    synthetic: true,
    untrained: true,
    observed: ["SST (OSTIA REP)"],
    sourceStatus: [{ id: "OSTIA", mode: "observed", note: "SST (OSTIA REP)" }],
    engineMode: "swin-monotonic-oi",
    gapMethod: "oi",
    version: "0.1.0",
    timingMs: 9
  };
}
describe("provenance mapping", () => {
  it("demo result carries all-synthetic untrained provenance", () => {
    const r = runDemoSync(base());
    expect(r.prov.inputs.sst.synthetic).toBe(true);
    expect(r.prov.argo.synthetic).toBe(true);
    expect(r.prov.model.trained).toBe(false);
    expect(r.prov.metricRef.heldOutArgo).toBe(false);
    expect(metricRefShort(r)).toBe("vs synthetic truth");
    expect(showDemoBadge(r)).toBe(true);
    expect(showUntrainedNotice(r)).toBe(true);
    expect(hasRealInputs(r.prov)).toBe(false);
  });
  it("status chip names demo mode", () => {
    const r = runDemoSync(base());
    const chip = statusChip(r, "demo", "demo");
    expect(chip.text).toContain("Demo");
    expect(chip.text).toContain("synthetic");
  });
  it("live SST payload marks sst observed and rest synthetic", () => {
    const p = livePayload();
    expect(isValidRemotePayload(p)).toBe(true);
    const prov = remoteProvenance(p);
    expect(prov.inputs.sst.synthetic).toBe(false);
    expect(prov.inputs.sst.source).toContain("OSTIA");
    expect(prov.inputs.sss.synthetic).toBe(true);
    expect(prov.metricRef.label).toBe("vs synthetic truth");
    expect(hasRealInputs(prov)).toBe(true);
  });
  it("live chip names the real source and hides demo badge", () => {
    const out = remoteToResult(livePayload() as never, { ...base(), dataMode: "live" });
    const chip = statusChip(out, "remote", "live");
    expect(chip.text).toContain("OSTIA");
    expect(chip.tone).toBe("live");
    expect(showDemoBadge(out)).toBe(false);
    expect(showUntrainedNotice(out)).toBe(true);
    expect(provenanceLine(out)).toContain("untrained model");
    expect(provenanceLine(out)).toContain("synthetic truth");
  });
  it("remote synthetic payload keeps demo chip", () => {
    const r = runDemoSync(base());
    const p = livePayload();
    delete (p as Record<string, unknown>)["observed"];
    delete (p as Record<string, unknown>)["sourceStatus"];
    const out = remoteToResult(p as never, base());
    expect(showDemoBadge(out)).toBe(true);
    expect(statusChip(out, "remote", "demo").text).toContain("Remote");
    expect(out.prov.inputs.sst.synthetic).toBe(true);
    void r;
  });
  it("onnx provenance stays synthetic untrained", () => {
    const p = onnxProvenance();
    expect(p.inputs.sst.synthetic).toBe(true);
    expect(p.model.label).toContain("untrained");
    expect(demoProvenance().metricRef.label).toBe("vs synthetic truth");
  });
  it("held-out ARGO reference labels validation skill", () => {
    const r = runDemoSync(base());
    const held = { ...r, prov: { ...r.prov, argo: { synthetic: false, source: "Coriolis GDAC" }, metricRef: { heldOutArgo: true, label: "vs held-out ARGO" } } };
    expect(metricRefShort(held)).toBe("vs held-out ARGO");
    expect(provenanceLine(held)).toContain("held-out ARGO");
    expect(inputSourceText(held, "sst")).toBe("synthetic");
  });
  it("input source text names real origins", () => {
    const out = remoteToResult(livePayload() as never, { ...base(), dataMode: "live" });
    expect(inputSourceText(out, "sst")).toContain("OSTIA");
    expect(inputSourceText(out, "sss")).toBe("synthetic");
  });
});
