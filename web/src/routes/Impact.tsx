import { useNavigate } from "react-router-dom";
import { useSession } from "@/store/session";
import { profileAt } from "@/engine/demo/engine";
import { DemoBadge } from "@/components/badges";
import { profileCsv, fieldCsv, fieldNetcdf, download } from "@/lib/export";
export function mackenzie(temp: number, sal: number, depth: number) {
  return 1448.96 + 4.591 * temp - 0.05304 * temp * temp + 0.0002374 * temp * temp * temp + 1.34 * (sal - 35) + 0.0163 * depth + 1.675e-7 * depth * depth - 0.01025 * temp * (sal - 35) - 7.139e-13 * temp * depth * depth * depth;
}
export function ImpactPage() {
  const s = useSession();
  const nav = useNavigate();
  const r = s.result;
  const prof = r ? profileAt(r, s.selRow, s.selCol) : null;
  const uohc = r?.metrics.uohc || 0;
  const thermo = r?.metrics.thermoDepth || 0;
  const surf = prof ? prof.recon[0] : NaN;
  const sound = prof ? mackenzie(prof.recon[5] || 20, prof.sal[5] || 35, 100) : NaN;
  function open(diag: string) {
    s.setDiagnostic(diag);
    nav("/");
  }
  const cards = [
    { title: "Marine Heatwave Monitoring", body: "Subsurface heat buildup from reconstructed field can help flag emerging warm anomalies.", diag: "subsurface", val: "surface " + (Number.isFinite(surf) ? surf.toFixed(2) + " C" : "—") },
    { title: "Cyclone Intensity Forecasting", body: "Upper-ocean heat content supports intensity context alongside atmospheric guidance.", diag: "subsurface", val: "UOHC " + uohc.toFixed(1) + " x10^8 J/m2" },
    { title: "Fisheries / Tuna Tracking", body: "Thermocline depth and thermal fronts can help indicate habitat structure.", diag: "ssh", val: "thermocline " + thermo.toFixed(0) + " m" },
    { title: "Indian Navy / Sound Speed Profiles", body: "Derived demo sound-speed profile from T/S/depth via Mackenzie equation.", diag: "sss", val: "c(100m) " + (Number.isFinite(sound) ? sound.toFixed(1) + " m/s" : "—") + " · derived demo" },
    { title: "Climate Research", body: "UOHC and temperature anomaly views support heat-content tracking.", diag: "sst", val: "anomaly context · UOHC " + uohc.toFixed(1) },
    { title: "Disaster Management", body: "Reconstructed state fields for storm and tsunami model initialization. Export region/date field.", diag: "ssh", val: "export NetCDF/CSV in browser" }
  ];
  function exportProfileCsv() {
    if (!r || !prof) return;
    const out = profileCsv(r, s.selRow, s.selCol, s.region, s.date);
    download(out.text, out.name, "text/csv");
  }
  function exportFieldCsv() {
    if (!r) return;
    const out = fieldCsv(r, s.depthIndex, s.region, s.date);
    download(out.text, out.name, "text/csv");
  }
  function exportNetcdf() {
    if (!r) return;
    const out = fieldNetcdf(r, s.region, s.date, s.depthIndex);
    download(out.bytes, out.name, "application/x-netcdf");
  }
  return (
    <div className="space-y-3" data-testid="impact-page">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <div key={c.title} className="strata-card p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-cyan-100">{c.title}</div>
              <DemoBadge compact />
            </div>
            <div className="mt-1 text-xs text-slate-200">{c.body}</div>
            <div className="mono mt-1 text-[11px] text-cyan-100">{c.val}</div>
            <button onClick={() => open(c.diag)} className="mt-2 w-full rounded border border-cyan-300/40 bg-cyan-400/10 px-2 py-1 text-xs text-cyan-100">Open Dashboard with layer</button>
          </div>
        ))}
      </div>
      <div className="strata-card space-y-2 p-3 text-xs" data-testid="export-panel">
        <div className="text-[11px] uppercase tracking-widest text-slate-300/70">Export current field · works for Demo ONNX Remote · {r ? r.provenance : "no run yet"}</div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportProfileCsv} data-testid="export-profile-csv" className="rounded bg-cyan-400/20 px-3 py-1 text-cyan-100">Export selected profile CSV</button>
          <button onClick={exportFieldCsv} data-testid="export-field-csv" className="rounded bg-cyan-400/20 px-3 py-1 text-cyan-100">Export region field CSV</button>
          <button onClick={exportNetcdf} data-testid="export-netcdf" className="rounded bg-cyan-400/20 px-3 py-1 text-cyan-100">Export region field NetCDF</button>
        </div>
      </div>
    </div>
  );
}
