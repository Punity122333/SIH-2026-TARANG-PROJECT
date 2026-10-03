import { useState } from "react";
import { useSession } from "@/store/session";
const BLOCKS = [
  { id: "inputs", title: "Surface Satellite Inputs", purpose: "2D surface fields feeding reconstruction", inputs: "SST SSS SSH currents winds", outputs: "7-channel grid", tech: "Copernicus / PODAAC adapters", role: "Observational basis" },
  { id: "harm", title: "Harmonization", purpose: "Common 0.25° daily grid", inputs: "Multi-resolution swaths", outputs: "[T=7,C=7,120,240]", tech: "xESMF conservative + OI/GP", role: "Preserves heat content" },
  { id: "swin", title: "Swin Transformer (land-sea masked)", purpose: "Spatial embedding without land leakage", inputs: "Harmonized tensor + mask", outputs: "Feature maps", tech: "Masked attention", role: "Coastal fidelity" },
  { id: "lstm", title: "ConvLSTM (7-day window)", purpose: "Propagating wave memory", inputs: "7-day features", outputs: "Temporal state", tech: "ConvLSTM", role: "Thermocline dynamics" },
  { id: "z", title: "Latent Embedding Z (SimCLR)", purpose: "Subsurface-structure embedding", inputs: "Spatio-temporal state", outputs: "Z vector", tech: "SimCLR NT-Xent, train split only", role: "Contrastive prior" },
  { id: "mono", title: "Monotonic Neural Network", purpose: "Stability-constrained mapping", inputs: "Z", outputs: "Decreasing control values", tech: "Cumulative softplus", role: "No inversions" },
  { id: "spline", title: "Cubic B-Spline Decoder", purpose: "Smooth profile at 15 depths", inputs: "Control points", outputs: "T(z) 0–1000 m", tech: "Piecewise cubic", role: "Thermocline shape" },
  { id: "profile", title: "15 Depth-Level Profile", purpose: "Deliverable vertical structure", inputs: "Spline", outputs: "15-level T + S", tech: "Shared depth constant", role: "Analysis unit" },
  { id: "phys", title: "Physics Loss", purpose: "Static stability + thermal wind", inputs: "T(z), density shear", outputs: "MSE + λ terms", tech: "PyTorch Lightning", role: "Physical consistency" },
  { id: "argo", title: "ARGO Validation", purpose: "Independent held-out check", inputs: "Float profiles", outputs: "RMSE Bias R² thermo err", tech: "Coriolis GDAC open access", role: "Never trained on" }
];
export function ModelExplorer() {
  const s = useSession();
  const [sel, setSel] = useState(BLOCKS[2]);
  const m = s.result?.metrics;
  return (
    <div className="grid gap-3 lg:grid-cols-2" data-testid="model-explorer">
      <div className="strata-card p-3">
        <div className="text-[11px] uppercase tracking-widest text-slate-300/70">Architecture · click a block</div>
        <div className="mt-2 flex flex-col gap-1">
          {BLOCKS.map((b) => (
            <button
              key={b.id}
              onClick={() => setSel(b)}
              aria-pressed={sel.id === b.id}
              className={"rounded border px-2 py-1.5 text-left text-xs " + (sel.id === b.id ? "border-cyan-300/60 bg-cyan-400/10 text-cyan-100" : "border-slate-500/25 text-slate-200")}
            >
              <span className="mono">{b.title}</span>
              {b.id === "harm" && m ? <span className="mono ml-2 text-[10px] text-cyan-200">[T=7,C=7,120,240]</span> : null}
              {b.id === "phys" && m ? <span className="mono ml-2 text-[10px] text-cyan-200">loss {m.total.toFixed(3)}</span> : null}
              {b.id === "argo" && m ? <span className="mono ml-2 text-[10px] text-cyan-200">RMSE {m.rmse.toFixed(2)}</span> : null}
            </button>
          ))}
        </div>
      </div>
      <div className="strata-card p-3">
        <div className="mono text-sm text-cyan-100">{sel.title}</div>
        <dl className="mt-2 space-y-1 text-xs">
          {(["purpose", "inputs", "outputs", "tech", "role"] as const).map((k) => (
            <div key={k} className="grid grid-cols-3 gap-2 rounded border border-slate-500/20 p-1.5">
              <dt className="uppercase tracking-widest text-slate-300/60">{k}</dt>
              <dd className="col-span-2">{sel[k]}</dd>
            </div>
          ))}
        </dl>
        <div className="mono mt-2 rounded border border-slate-500/20 p-1.5 text-[11px]">
          Live: tensor [T=7,C=7,120,240] · Z dim 128 (demo default) · depths 15 · λ1 {s.physics.lambda1.toFixed(2)} λ2 {s.physics.lambda2.toFixed(2)}
        </div>
        <div className="mt-2 grid grid-cols-8 gap-1" aria-label="Attention mask concept">
          {Array.from({ length: 32 }).map((_, i) => {
            const land = i % 7 === 0;
            return <span key={i} title={land ? "land token masked" : "ocean token attending"} className={"h-5 rounded " + (land ? "bg-slate-600/60" : "bg-cyan-400/60")} />;
          })}
        </div>
        <div className="mt-1 text-[10px] text-slate-300/60">Land tokens masked (grey) receive zero attention weight. Ocean tokens attend (cyan).</div>
      </div>
    </div>
  );
}
