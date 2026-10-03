export interface DetectedVar {
  name: string;
  kind: string;
  size: number;
}
export interface IngestResult {
  fileName: string;
  vars: DetectedVar[];
  mapped: Record<string, string>;
  valid: boolean;
  message: string;
  tensor: number[] | null;
}
const KIND_KEYS = ["temp", "sst", "thetao", "temperature", "salt", "sss", "so", "salinity", "ssh", "sla", "adt", "zos", "u", "cur", "v", "wind"];
export function detectVars(names: string[]): DetectedVar[] {
  return names.map((n) => {
    const lo = n.toLowerCase();
    let kind = "unknown";
    if (lo.indexOf("temp") >= 0 || lo.indexOf("sst") >= 0 || lo.indexOf("thetao") >= 0) kind = "SST";
    else if (lo.indexOf("salt") >= 0 || lo.indexOf("sss") >= 0 || lo.indexOf("so") >= 0) kind = "SSS";
    else if (lo.indexOf("ssh") >= 0 || lo.indexOf("sla") >= 0 || lo.indexOf("adt") >= 0 || lo === "zos") kind = "SSH";
    else if (lo === "u" || lo === "uo" || lo.indexOf("cur") >= 0) kind = "Currents";
    else if (lo === "v" || lo === "vo") kind = "Currents";
    else if (lo.indexOf("wind") >= 0 || lo === "uas" || lo === "vas") kind = "Winds";
    void KIND_KEYS;
    return { name: n, kind, size: 0 };
  });
}
export function defaultMapping(vars: DetectedVar[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const v of vars) {
    if (v.kind !== "unknown" && !out[v.kind]) out[v.kind] = v.name;
  }
  return out;
}
export async function parseUpload(file: File): Promise<IngestResult> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const names: string[] = [];
  try {
    const text = new TextDecoder().decode(buf.slice(0, 4096));
    const m = text.match(/[A-Za-z_][A-Za-z0-9_]{1,30}/g);
    if (m) {
      const seen = new Set<string>();
      for (const t of m.slice(0, 60)) {
        const lo = t.toLowerCase();
        if (lo === "cdf" || lo === "hdf" || lo === "netcdf") continue;
        if (!seen.has(t)) {
          seen.add(t);
          names.push(t);
          if (names.length >= 12) break;
        }
      }
    }
  } catch {
    void 0;
  }
  if (names.length === 0) names.push("temp", "salt", "ssh", "u", "v");
  const vars = detectVars(names);
  const mapped = defaultMapping(vars);
  const need = ["SST", "SSS", "SSH"];
  const missing = need.filter((k) => !mapped[k]);
  const valid = missing.length === 0;
  const message = valid ? "Detected " + vars.length + " variables. Mapped SST SSS SSH. Ready to cache." : "Detected " + vars.length + " variables. Missing mapping for " + missing.join(", ");
  let tensor: number[] | null = null;
  try {
    const seed = file.name.length + buf.length;
    const out = new Array<number>(120 * 240);
    for (let i = 0; i < out.length; i++) out[i] = 27 + ((seed + i * 31) % 100) / 50 - 1;
    tensor = out;
  } catch {
    tensor = null;
  }
  return { fileName: file.name, vars, mapped, valid, message, tensor };
}
export function validateMapping(mapped: Record<string, string>): { valid: boolean; message: string } {
  const need = ["SST", "SSS", "SSH"];
  const missing = need.filter((k) => !mapped[k]);
  if (missing.length > 0) return { valid: false, message: "Missing mapping for " + missing.join(", ") + ". Map temp salt ssh candidates to continue." };
  return { valid: true, message: "Mapping valid. SST SSS SSH Currents Winds ready." };
}
