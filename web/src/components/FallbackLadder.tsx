import { useSession } from "@/store/session";
import { ENGINE_MODES } from "@/lib/config";
export function FallbackLadder() {
  const s = useSession();
  const rows = [
    { k: "Data Pipeline", a: "Live xarray/Dask chunking", b: "Pre-processed .npy tensors" },
    { k: "Embedding Model", a: "Swin-T + ConvLSTM", b: "ResNet-18 + 2D Conv" },
    { k: "Decoder", a: "Monotonic Spline + PINN", b: "Standard 1D MLP (15 outputs)" },
    { k: "Gap Filling", a: "Optimal Interpolation (OI)", b: "Bilinear Interpolation" },
    { k: "Dashboard", a: "Deck.gl 3D", b: "2D map-only view" }
  ];
  return (
    <div className="strata-card p-3" data-testid="fallback-ladder">
      <div className="text-[11px] uppercase tracking-widest text-slate-300/70">Fallback ladder</div>
      <div className="mt-2 space-y-1.5 text-xs">
        {rows.map((r) => (
          <div key={r.k} className="grid grid-cols-3 gap-2 rounded border border-slate-500/20 p-1.5">
            <span className="text-slate-200">{r.k}</span>
            <span className="text-cyan-200">{r.a}</span>
            <span className="text-amber-200">{r.b}</span>
          </div>
        ))}
      </div>
      <label htmlFor="fb-mode" className="mt-2 block text-[11px] uppercase tracking-widest text-slate-300/70">Engine mode selector</label>
      <select id="fb-mode" value={s.engineMode} onChange={(e) => s.setEngineMode(e.target.value)} className="mt-1 w-full rounded border border-slate-500/30 bg-slate-950/60 p-1.5 text-xs">
        {ENGINE_MODES.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
    </div>
  );
}
