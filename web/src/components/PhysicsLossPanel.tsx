import { useSession } from "@/store/session";
export function PhysicsLossPanel() {
  const s = useSession();
  const m = s.result?.metrics;
  const mse = m?.mse || 0;
  const ls = m?.lStab || 0;
  const lt = m?.lThermal || 0;
  const l1 = s.physics.stabOn ? s.physics.lambda1 : 0;
  const l2 = s.physics.thermalOn ? s.physics.lambda2 : 0;
  const total = mse + l1 * ls + l2 * lt;
  const max = Math.max(1e-9, total);
  return (
    <div className="strata-card p-3" data-testid="physics-panel">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-widest text-slate-300/70">Physics loss (simulated)</div>
      </div>
      <div className="mono mt-1 text-[11px] text-cyan-100">Total Loss = MSE + λ1·L_stab + λ2·L_thermal_wind</div>
      <div className="mt-2 space-y-2 text-xs">
        <label className="block">
          <span>λ1 Static stability: {s.physics.lambda1.toFixed(2)}</span>
          <input aria-label="lambda1" type="range" min={0} max={3} step={0.1} value={s.physics.lambda1} onChange={(e) => s.setPhysics({ lambda1: Number(e.target.value) })} className="w-full accent-cyan-300" />
        </label>
        <label className="block">
          <span>λ2 Thermal wind: {s.physics.lambda2.toFixed(2)}</span>
          <input aria-label="lambda2" type="range" min={0} max={3} step={0.1} value={s.physics.lambda2} onChange={(e) => s.setPhysics({ lambda2: Number(e.target.value) })} className="w-full accent-cyan-300" />
        </label>
      </div>
      <div aria-label="loss decomposition" className="mt-2 flex h-4 w-full overflow-hidden rounded border border-slate-500/30">
        <div style={{ width: (mse / max) * 100 + "%" }} className="bg-cyan-400/70" title={"MSE " + mse.toFixed(4)} />
        <div style={{ width: ((l1 * ls) / max) * 100 + "%" }} className="bg-amber-400/70" title={"stab " + (l1 * ls).toFixed(4)} />
        <div style={{ width: ((l2 * lt) / max) * 100 + "%" }} className="bg-rose-400/70" title={"thermal " + (l2 * lt).toFixed(4)} />
      </div>
      <div className="mono mt-1 grid grid-cols-4 gap-1 text-[10px] text-slate-200">
        <span>MSE {mse.toFixed(4)}</span>
        <span>Lstab {ls.toFixed(5)}</span>
        <span>Lth {lt.toFixed(5)}</span>
        <span>Total {total.toFixed(4)}</span>
      </div>
    </div>
  );
}
