import { formatNum } from "@/lib/utils";
export function MetricCard({ label, value, unit, hint, testId, badge }: { label: string; value: number | string; unit?: string; hint?: string; testId?: string; badge?: string }) {
  const text = typeof value === "number" ? formatNum(value) : value;
  return (
    <div data-testid={testId || "metric-" + label} className="strata-card min-w-0 p-3">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="min-w-0 flex-1 truncate text-[11px] uppercase tracking-widest text-slate-300/70">{label}</div>
        {badge ? <span data-testid="weak-badge" className="inline-flex shrink-0 items-center rounded border border-amber-300/40 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-widest text-amber-200">{badge}</span> : null}
      </div>
      <div className="mono mt-1 text-xl text-cyan-100">
        {text} {unit ? <span className="text-xs text-slate-300/70">{unit}</span> : null}
      </div>
      {hint ? <div className="mt-1 text-[11px] text-slate-300/60">{hint}</div> : null}
    </div>
  );
}
