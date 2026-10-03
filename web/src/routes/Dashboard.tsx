import { useSession } from "@/store/session";
import { MapView } from "@/components/Map";
import { ProfileChart } from "@/components/ProfileChart";
import { TSChart } from "@/components/TSChart";
import { Ocean3DView } from "@/components/Ocean3DView";
import { PhysicsLossPanel } from "@/components/PhysicsLossPanel";
import { IngestPanel } from "@/components/IngestPanel";
import { HarmonizePanel } from "@/components/HarmonizePanel";
import { MetricCard } from "@/components/MetricCard";
import { DepthSlider } from "@/components/DepthSlider";
import { DemoBadge, LoadingState, EmptyState } from "@/components/badges";
import { provenanceLine, metricRefShort, showDemoBadge, showUntrainedNotice } from "@/lib/provenance";
import { STABILITY_THRESHOLD } from "@/lib/config";
import { profileAt, regionBounds } from "@/engine/demo/engine";
import { gridToLonLat } from "@/lib/utils";
export function Dashboard() {
  const s = useSession();
  const r = s.result;
  const bounds = regionBounds(s.region);
  const ll = gridToLonLat(s.selRow, s.selCol, bounds, 120, 240);
  const prof = r ? profileAt(r, s.selRow, s.selCol) : null;
  const surfT = prof ? prof.recon[0] : NaN;
  const stable = r ? r.metrics.lStab <= STABILITY_THRESHOLD : false;
  const diagButtons = ["sst", "sss", "ssh", "subsurface"];
  if (s.running && !r) return <div data-testid="dashboard"><LoadingState label="Running reconstruction…" /></div>;
  if (!r) return <div data-testid="dashboard"><EmptyState label="No reconstruction yet. Press Run Reconstruction." /></div>;
  return (
    <div className="space-y-3" data-testid="dashboard">
      <div className="grid gap-3 xl:grid-cols-[1fr_300px]">
        <div className="space-y-3">
          <div className="strata-card flex flex-wrap items-center gap-2 p-2 text-[11px]">
            <span className="uppercase tracking-widest text-slate-300/70">Diagnostic layer</span>
            {diagButtons.map((d) => (
              <button key={d} onClick={() => s.setDiagnostic(d)} aria-pressed={s.diagnostic === d} className={"rounded border px-2 py-0.5 uppercase " + (s.diagnostic === d ? "border-cyan-300/60 bg-cyan-400/15 text-cyan-100" : "border-slate-500/30 text-slate-300/60")}>
                {d}
              </button>
            ))}
            <span className="mono ml-auto text-slate-300/50">3D subsurface from 2D satellite · {r.prov.argo.source} · {metricRefShort(r)}</span>
          </div>
          <MapView height={430} />
          <DepthSlider index={s.depthIndex} onChange={s.setDepthIndex} />
          <div className="grid gap-3 md:grid-cols-2">
            <ProfileChart />
            <TSChart />
          </div>
          <Ocean3DView />
        </div>
        <div className="space-y-3">
          <div className="strata-card min-w-0 p-3" data-testid="recon-panel">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <div className="min-w-0 flex-1 truncate text-[11px] uppercase tracking-widest text-slate-300/70">Reconstruction · {r.engineId} · {provenanceLine(r)}</div>
              {showDemoBadge(r) ? <DemoBadge compact /> : null}
            </div>
            <div className="mono mt-1 text-[11px] text-slate-200"> {ll.lat.toFixed(2)}N {ll.lon.toFixed(2)}E · row {s.selRow} col {s.selCol}</div>
            <div className={"mt-1 rounded border px-2 py-1 text-xs " + (stable ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-100" : "border-amber-300/40 bg-amber-400/10 text-amber-100")}>
              {stable ? "Physics-consistent reconstruction" : "Physics warning: stability loss above threshold"}
            </div>
            <div className="mono mt-1 text-[10px] text-slate-300/50">{r.engineId} engine {s.runtimeMs ? s.runtimeMs.toFixed(0) + " ms" : ""} · Training: GPU (CUDA) · Inference: CPU · {r.synthetic ? "synthetic data" : "observed data"} · {r.untrained ? "untrained weights" : "trained weights"}</div>
            {showUntrainedNotice(r) && !showDemoBadge(r) ? <div data-testid="untrained-notice" className="mono mt-1 text-[10px] text-amber-200">Untrained model: outputs are not scientific results</div> : null}
          </div>
          {r ? (
            <div className="grid grid-cols-2 gap-2">
              <MetricCard label="Surface Temp" value={surfT} unit="C" />
              <MetricCard label="Thermocline" value={r.metrics.thermoDepth} unit="m" />
              <MetricCard label="RMSE" value={r.metrics.rmse} unit="C" hint={metricRefShort(r)} />
              <MetricCard label="Bias" value={r.metrics.bias} unit="C" hint={metricRefShort(r)} />
              <MetricCard label="R2" value={r.metrics.r2} unit="" hint={metricRefShort(r)} />
              <MetricCard label="Thermo Err" value={r.metrics.thermoErr} unit="m" hint={metricRefShort(r)} />
              <MetricCard label="UOHC" value={r.metrics.uohc} unit="10^8 J/m2" />
              <MetricCard label="Missing" value={r.metrics.missingPct} unit="%" />
            </div>
          ) : null}
          <PhysicsLossPanel />
          <IngestPanel />
          <HarmonizePanel />
        </div>
      </div>
    </div>
  );
}
