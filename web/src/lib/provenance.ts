import type { Provenance, RunResult } from "@/engine/types";
export function synth(source: string) {
  return { synthetic: true, source };
}
export function observed(source: string) {
  return { synthetic: false, source };
}
export function demoProvenance(): Provenance {
  return {
    inputs: { sst: synth("synthetic"), sss: synth("synthetic"), ssh: synth("synthetic"), currents: synth("synthetic"), winds: synth("synthetic") },
    argo: { synthetic: true, source: "synthetic ARGO-like profiles" },
    model: { trained: false, label: "untrained model" },
    metricRef: { heldOutArgo: false, label: "vs synthetic truth" }
  };
}
export function onnxProvenance(): Provenance {
  const p = demoProvenance();
  p.model = { trained: false, label: "untrained ONNX weights" };
  return p;
}
interface LivePayload {
  observed?: unknown;
  sourceStatus?: unknown;
  provenance?: unknown;
}
function observedLabels(p: LivePayload): string[] {
  if (!Array.isArray(p.observed)) return [];
  return (p.observed as unknown[]).filter((x) => typeof x === "string") as string[];
}
function sstObservedSource(p: LivePayload): string | null {
  const labels = observedLabels(p);
  for (const l of labels) {
    if (l.indexOf("OSTIA") >= 0) return l;
  }
  if (Array.isArray(p.sourceStatus)) {
    for (const s of p.sourceStatus as Record<string, unknown>[]) {
      if (s && s["id"] === "OSTIA" && s["mode"] === "observed" && typeof s["note"] === "string") return s["note"] as string;
    }
  }
  return null;
}
export function remoteProvenance(p: LivePayload): Provenance {
  const base = demoProvenance();
  const sstSrc = sstObservedSource(p);
  if (sstSrc) base.inputs.sst = observed(sstSrc);
  return base;
}
export function hasRealInputs(prov: Provenance): boolean {
  const ins = [prov.inputs.sst, prov.inputs.sss, prov.inputs.ssh, prov.inputs.currents, prov.inputs.winds];
  return ins.some((x) => !x.synthetic);
}
export function allInputsSynthetic(prov: Provenance): boolean {
  return !hasRealInputs(prov);
}
export function statusChip(result: RunResult | null, engine: string, dataMode: string): { text: string; tone: string } {
  if (result && result.prov) {
    const prov = result.prov;
    if (hasRealInputs(prov)) {
      const realNames: string[] = [];
      if (!prov.inputs.sst.synthetic) realNames.push(prov.inputs.sst.source);
      if (!prov.inputs.sss.synthetic) realNames.push(prov.inputs.sss.source);
      if (!prov.inputs.ssh.synthetic) realNames.push(prov.inputs.ssh.source);
      return { text: "Live · " + realNames.join(" + ") + " + synthetic rest", tone: "live" };
    }
    if (result.engineId === "onnx") return { text: "ONNX · synthetic inputs", tone: "demo" };
    if (result.engineId === "remote") return { text: "Remote · synthetic inputs", tone: "demo" };
    return { text: "Demo · synthetic inputs", tone: "demo" };
  }
  if (engine === "remote" && dataMode === "live") return { text: "Live · server inputs", tone: "live" };
  if (engine === "remote") return { text: "Remote · synthetic inputs", tone: "demo" };
  if (engine === "onnx") return { text: "ONNX · synthetic inputs", tone: "demo" };
  return { text: "Demo · synthetic inputs", tone: "demo" };
}
export function provenanceLine(result: RunResult): string {
  const prov = result.prov;
  const inBits: string[] = [];
  if (!prov.inputs.sst.synthetic) inBits.push(prov.inputs.sst.source + " observed");
  else inBits.push("synthetic inputs");
  const rest = [prov.inputs.sss, prov.inputs.ssh, prov.inputs.currents, prov.inputs.winds].every((x) => x.synthetic);
  const head = inBits[0] + (rest && !prov.inputs.sst.synthetic ? ", rest synthetic" : "");
  const tail = prov.model.trained ? "trained model" : "untrained model";
  const ref = prov.metricRef.heldOutArgo ? "metrics vs held-out ARGO" : "metrics vs synthetic truth";
  return head + " · " + tail + " · " + ref;
}
export function metricRefShort(result: RunResult): string {
  return result.prov.metricRef.label;
}
export function showDemoBadge(result: RunResult): boolean {
  return allInputsSynthetic(result.prov);
}
export function showUntrainedNotice(result: RunResult): boolean {
  return !result.prov.model.trained;
}
export function inputSourceText(result: RunResult, key: "sst" | "sss" | "ssh" | "currents" | "winds"): string {
  const inp = result.prov.inputs[key];
  return inp.synthetic ? "synthetic" : inp.source + " observed";
}
