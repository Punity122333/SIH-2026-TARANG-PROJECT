import type { RunResult } from "@/engine/types";
export function profileCsv(r: RunResult, row: number, col: number, region: string, date: string): { text: string; name: string } {
  const rows = ["depth_m,temp_recon_c,temp_truth_c,sal_psu"];
  for (let k = 0; k < r.depths.length; k++) {
    const idx = k * r.h * r.w + row * r.w + col;
    const a = r.reconVolume[idx];
    const b = r.truthVolume[idx];
    const c = r.salVolume[idx];
    const fmt = (v: number) => (Number.isFinite(v) ? v.toFixed(3) : "");
    rows.push([r.depths[k], fmt(a), fmt(b), fmt(c)].join(","));
  }
  return { text: rows.join("\n"), name: "strata-" + region + "-" + date + ".csv" };
}
export function fieldCsv(r: RunResult, depthIndex: number, region: string, date: string): { text: string; name: string } {
  const rows = ["row,col,lon_idx,lat_idx,temp_recon_c"];
  for (let rr = 0; rr < r.h; rr += 2) {
    for (let cc = 0; cc < r.w; cc += 2) {
      const v = r.reconVolume[depthIndex * r.h * r.w + rr * r.w + cc];
      rows.push([rr, cc, cc, rr, Number.isFinite(v) ? v.toFixed(3) : ""].join(","));
    }
  }
  return { text: rows.join("\n"), name: "strata-field-" + region + "-" + date + "-z" + depthIndex + ".csv" };
}
export function fieldNetcdf(r: RunResult, region: string, date: string, depthIndex: number): { bytes: Uint8Array; name: string } {
  const h = r.h;
  const w = r.w;
  const lines: string[] = [];
  lines.push("netcdf strata-" + region + "-" + date + " {");
  lines.push("dimensions: depth = " + r.depths.length + ", y = " + h + ", x = " + w + " ;");
  lines.push("variables: float depth(depth) ; float temp(depth, y, x) ; float sal(depth, y, x) ;");
  lines.push("data: depth = " + r.depths.join(", ") + " ;");
  const k = Math.min(r.depths.length - 1, Math.max(0, depthIndex));
  const vals: string[] = [];
  for (let rr = 0; rr < h; rr += 4) {
    for (let cc = 0; cc < w; cc += 4) {
      const v = r.reconVolume[k * h * w + rr * w + cc];
      vals.push(Number.isFinite(v) ? v.toFixed(2) : "_");
      if (vals.length >= 2000) break;
    }
    if (vals.length >= 2000) break;
  }
  lines.push("temp_sample_z" + k + " = " + vals.join(", ") + " ;");
  lines.push("provenance = \"" + r.provenance + "\" ; synthetic = " + (r.synthetic ? 1 : 0) + " ; untrained = " + (r.untrained ? 1 : 0) + " ; engine = \"" + r.engineId + "\" ;");
  lines.push("}");
  const text = lines.join("\n");
  return { bytes: new TextEncoder().encode(text), name: "strata-" + region + "-" + date + ".nc" };
}
export function download(textOrBytes: string | Uint8Array, name: string, type: string) {
  const blob = typeof textOrBytes === "string" ? new Blob([textOrBytes], { type }) : new Blob([textOrBytes as unknown as BlobPart], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try {
      URL.revokeObjectURL(a.href);
      a.remove();
    } catch {
      void 0;
    }
  }, 500);
}
