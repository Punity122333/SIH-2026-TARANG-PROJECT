import { useSession } from "@/store/session";
import { GAP_METHODS } from "@/lib/config";
export function HarmonizePanel() {
  const s = useSession();
  const r = s.result;
  const miss = r?.metrics.missingPct || 0;
  return (
    <div className="strata-card p-3" data-testid="harmonize-panel">
      <div className="text-[11px] uppercase tracking-widest text-slate-300/70">Stage 2 · Harmonize · 0.25° daily</div>
      <div className="mono mt-1 text-[11px] text-cyan-100">RAW DATA → REGRIDDED DATA → GAP-FILLED DATA</div>
      <div className="mono mt-1 rounded border border-cyan-300/30 bg-cyan-400/5 p-1.5 text-[11px]">
        Tensor 7 × 120 × 240 · 7 channels (SST, SSS, SSH, CUR_U, CUR_V, WIND_U, WIND_V) over 120×240 grid at 0.25° (30°×60° North Indian Ocean) · 7-day window stacks to [T=7, C=7, 120, 240]
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        {(["RAW", "REGRIDDED", "GAP-FILLED"] as const).map((t, i) => (
          <div key={t} className="rounded border border-slate-500/20 p-1.5">
            <div className="tracking-widest text-slate-200">{t}</div>
            <div className="mono mt-1 text-cyan-100">{i === 0 ? miss.toFixed(1) + "% gaps" : i === 1 ? "0.25°" : "filled"}</div>
            <div className="mt-1 h-10 w-full rounded" style={{ background: i === 0 ? "repeating-linear-gradient(45deg,#0c4a6e 0 4px,#040b18 4px 8px)" : i === 1 ? "linear-gradient(90deg,#0c4a6e,#22d3ee)" : "linear-gradient(90deg,#22d3ee,#fde68a)" }} />
          </div>
        ))}
      </div>
      <label htmlFor="hz-gap" className="mt-2 block text-[11px] uppercase tracking-widest text-slate-300/70">Gap-fill method</label>
      <select id="hz-gap" value={s.gapMethod} onChange={(e) => s.setGapMethod(e.target.value)} className="mt-1 w-full rounded border border-slate-500/30 bg-slate-950/60 p-1.5 text-xs">
        {GAP_METHODS.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
    </div>
  );
}
