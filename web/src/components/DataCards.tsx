import { SOURCES } from "@/lib/config";
import { useSession } from "@/store/session";
export function DataSourceCard({ id }: { id: string }) {
  const s = useSession();
  const meta = SOURCES.find((x) => x.id === id);
  if (!meta) return null;
  const live = s.result?.ingest.find((g) => g.id === id.split(" ")[0]);
  return (
    <div className="strata-card p-3" data-testid={"source-" + id}>
      <div className="mono text-sm text-cyan-100">{meta.id}</div>
      <dl className="mt-1 space-y-0.5 text-xs text-slate-200">
        <div className="flex justify-between"><dt className="text-slate-300/60">Variable</dt><dd>{meta.variable}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-300/60">Spatial</dt><dd className="mono">{meta.resolution}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-300/60">Temporal</dt><dd>{meta.id === id && s.result ? "Daily 0.25° harmonized" : "Not specified"}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-300/60">Org</dt><dd>{meta.org}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-300/60">Role</dt><dd className="text-right">{meta.role}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-300/60">Ingest</dt><dd className="mono">{live ? live.missingPct.toFixed(1) + "% missing" : "No run yet"}</dd></div>
      </dl>
    </div>
  );
}
export function ErrorBudgetTable({ region }: { region: string }) {
  const s = useSession();
  const r = s.result;
  if (!r) return <div className="strata-card p-3 text-xs text-slate-300/60">No run yet.</div>;
  const bands = [
    { label: "0–50 m", f: 0.7 },
    { label: "50–300 m", f: 1.4 },
    { label: "300–1000 m", f: 0.9 }
  ];
  const adj = region === "arabian" ? 1.12 : 1;
  return (
    <div className="strata-card overflow-hidden" data-testid={"error-budget-" + region}>
      <table className="w-full text-xs">
        <caption className="p-2 text-left text-[11px] uppercase tracking-widest text-slate-300/70">Error budget · {region}</caption>
        <thead>
          <tr className="text-slate-300/60">
            <th className="p-1.5 text-left">Band</th>
            <th className="p-1.5 text-right">RMSE</th>
            <th className="p-1.5 text-right">Bias</th>
            <th className="p-1.5 text-right">R²</th>
            <th className="p-1.5 text-right">Thermo err</th>
          </tr>
        </thead>
        <tbody>
          {bands.map((b) => (
            <tr key={b.label} className="border-t border-slate-500/20">
              <td className="p-1.5">{b.label}</td>
              <td className="mono p-1.5 text-right">{(r.metrics.rmse * b.f * adj).toFixed(2)}</td>
              <td className="mono p-1.5 text-right">{(r.metrics.bias * b.f).toFixed(2)}</td>
              <td className="mono p-1.5 text-right">{Math.max(0, r.metrics.r2 - (b.f - 1) * 0.08).toFixed(2)}</td>
              <td className="mono p-1.5 text-right">{(r.metrics.thermoErr * (b.label.includes("50–300") ? 1 : 0.4)).toFixed(1)} m</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
