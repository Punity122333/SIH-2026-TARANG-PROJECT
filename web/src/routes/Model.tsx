import { ModelExplorer } from "@/components/ModelExplorer";
import { FallbackLadder } from "@/components/FallbackLadder";
import { useSession } from "@/store/session";
import { CHANNEL_NAMES } from "@/lib/config";
export function ModelPage() {
  const s = useSession();
  return (
    <div className="space-y-3" data-testid="model-page">
      <ModelExplorer />
      <div className="grid gap-3 md:grid-cols-2">
        <div className="strata-card p-3">
          <div className="text-[11px] uppercase tracking-widest text-slate-300/70">Input channels · 7</div>
          <div className="mt-1 grid grid-cols-2 gap-1 text-xs">
            {CHANNEL_NAMES.map((c, i) => (
              <div key={c} className="mono rounded border border-slate-500/20 px-2 py-1">CH{i} · {c} · {s.layers[c.toLowerCase() as never] !== false ? "on" : "off"}</div>
            ))}
          </div>
          <div className="mt-2 text-[11px] uppercase tracking-widest text-slate-300/70">Temporal window · 7 days</div>
          <div className="mt-1 flex gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <span key={i} className="mono flex-1 rounded border border-cyan-300/30 bg-cyan-400/10 px-1 py-1 text-center text-[10px]">T-{6 - i}</span>
            ))}
          </div>
          <div className="mono mt-2 text-[11px] text-slate-300/60">Latent Z dim 128 (demo default) · SimCLR pre-training uses train split only, ARGO held out</div>
        </div>
        <div className="space-y-3">
          <FallbackLadder />
          <div className="strata-card p-3 text-xs">
            <div className="text-[11px] uppercase tracking-widest text-slate-300/70">Training / inference</div>
            <div className="mono mt-1">PyTorch Lightning · W&amp;B with TensorBoard fallback · CUDA training · CPU inference</div>
            <div className="mono mt-1 text-slate-300/60">Loss Total = MSE + λ1 {s.physics.lambda1.toFixed(2)} + λ2 {s.physics.lambda2.toFixed(2)} · live from latest run</div>
          </div>
        </div>
      </div>
    </div>
  );
}
