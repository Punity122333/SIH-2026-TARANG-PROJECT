import { DemoBadge } from "@/components/badges";
import { formatNum } from "@/lib/utils";
export function MetricCard({ label, value, unit, hint, testId }: { label: string; value: number | string; unit?: string; hint?: string; testId?: string }) {
  const text = typeof value === "number" ? formatNum(value) : value;
  return (
    <div data-testid={testId || "metric-" + label} className="strata-card p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] uppercase tracking-widest text-slate-300/70">{label}</div>
        <DemoBadge compact />
      </div>
      <div className="mono mt-1 text-xl text-cyan-100">
        {text} {unit ? <span className="text-xs text-slate-300/70">{unit}</span> : null}
      </div>
      {hint ? <div className="mt-1 text-[11px] text-slate-300/60">{hint}</div> : null}
    </div>
  );
}
