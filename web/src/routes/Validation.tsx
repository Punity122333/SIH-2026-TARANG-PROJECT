import { useSession } from "@/store/session";
import { ValidationChart } from "@/components/ValidationChart";
import { MetricCard } from "@/components/MetricCard";
import { ErrorBudgetTable } from "@/components/DataCards";
import { MapView } from "@/components/Map";
import { EmptyState } from "@/components/badges";
export function ValidationPage() {
  const s = useSession();
  const r = s.result;
  if (!r) return <div data-testid="validation-page"><EmptyState label="No validation profiles yet. Run reconstruction first." /></div>;
  return (
    <div className="space-y-3" data-testid="validation-page">
      <div className="strata-card p-2 text-[11px] text-slate-300/70">ARGO is independent held-out validation. STRATA never trains on it. All metrics computed from {r.engineId} {r.provenance} arrays.</div>
      {r ? (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <MetricCard label="RMSE" value={r.metrics.rmse} unit="C" />
          <MetricCard label="Bias" value={r.metrics.bias} unit="C" />
          <MetricCard label="R2" value={r.metrics.r2} unit="" />
          <MetricCard label="Thermo Err" value={r.metrics.thermoErr} unit="m" />
        </div>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-2">
        <ValidationChart />
        <MapView height={340} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <ErrorBudgetTable region="Bay of Bengal" />
        <ErrorBudgetTable region="Arabian Sea" />
      </div>
      <div className="strata-card p-3 text-xs">
        <div className="text-[11px] uppercase tracking-widest text-slate-300/70">Switch validation profile · click recenters map</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {(r?.argo || []).map((a) => (
            <button key={a.id} onClick={() => { s.setArgoId(a.id); s.setSelection(a.row, a.col); }} aria-pressed={s.argoId === a.id} className="rounded border border-slate-500/30 px-2 py-0.5 mono">{a.id} · {a.lat.toFixed(1)},{a.lon.toFixed(1)}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
