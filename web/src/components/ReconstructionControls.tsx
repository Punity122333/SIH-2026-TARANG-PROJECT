import { useSession } from "@/store/session";
import { REGIONS, ENGINE_MODES, GAP_METHODS, ENGINES, DATA_MODES } from "@/lib/config";
import { useOnline } from "@/lib/offline";
export function ReconstructionControls() {
  const s = useSession();
  const online = useOnline();
  return (
    <div className="space-y-3" data-testid="recon-controls">
      <div>
        <label htmlFor="rc-engine" className="text-[11px] uppercase tracking-widest text-slate-300/70">Engine</label>
        <select
          id="rc-engine"
          value={s.engine}
          onChange={(e) => s.setEngine(e.target.value as never)}
          className="mt-1 w-full rounded border border-slate-500/30 bg-slate-950/60 p-1.5 text-sm"
          aria-describedby="rc-engine-help"
        >
          {ENGINES.map((m) => (
            <option key={m.id} value={m.id} disabled={m.id === "onnx" && !s.onnxAvailable}>{m.label}{m.id === "remote" && !online ? " (offline disabled)" : ""}{m.id === "onnx" && !s.onnxAvailable ? " (no model)" : ""}</option>
          ))}
        </select>
        <div id="rc-engine-help" className="mono mt-1 text-[10px] text-slate-300/60">
          {s.engine === "demo" ? "Demo · synthetic inputs · untrained model" : null}
          {s.engine === "onnx" ? (s.onnxAvailable ? "ONNX · synthetic inputs · untrained weights" : s.onnxReason) : null}
          {s.engine === "remote" ? (!online ? "Remote is disabled while offline. Use Demo or ONNX." : "Remote runs the Python package server-side · untrained model") : null}
        </div>
      </div>
      <div>
        <label htmlFor="rc-datamode" className="text-[11px] uppercase tracking-widest text-slate-300/70">Data mode</label>
        <select id="rc-datamode" value={s.dataMode} onChange={(e) => s.setDataMode(e.target.value)} className="mt-1 w-full rounded border border-slate-500/30 bg-slate-950/60 p-1.5 text-sm">
          {DATA_MODES.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
        <div className="mono mt-1 text-[10px] text-slate-300/60">{s.dataMode === "live" ? "Live calls server adapters. Without credentials the server returns credentials_not_configured." : "Demo uses synthetic data in browser or server."}</div>
      </div>
      <div>
        <label htmlFor="rc-backend" className="text-[11px] uppercase tracking-widest text-slate-300/70">Backend URL</label>
        <input id="rc-backend" value={s.backendUrl} onChange={(e) => s.setBackendUrl(e.target.value)} placeholder="empty uses Vite proxy /api" className="mono mt-1 w-full rounded border border-slate-500/30 bg-slate-950/60 p-1.5 text-xs" />
      </div>
      <div>
        <label htmlFor="rc-region" className="text-[11px] uppercase tracking-widest text-slate-300/70">Region</label>
        <select
          id="rc-region"
          value={s.region}
          onChange={(e) => s.setRegion(e.target.value as never)}
          className="mt-1 w-full rounded border border-slate-500/30 bg-slate-950/60 p-1.5 text-sm"
        >
          {REGIONS.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="rc-date" className="text-[11px] uppercase tracking-widest text-slate-300/70">Date</label>
        <input
          id="rc-date"
          type="date"
          value={s.date}
          min="2000-01-01"
          max="2030-12-31"
          onChange={(e) => s.setDate(e.target.value)}
          className="mt-1 w-full rounded border border-slate-500/30 bg-slate-950/60 p-1.5 text-sm"
        />
      </div>
      <fieldset>
        <legend className="text-[11px] uppercase tracking-widest text-slate-300/70">Input layers</legend>
        <div className="mt-1 grid grid-cols-2 gap-1 text-sm">
          {(["sst", "sss", "ssh", "currents", "winds"] as const).map((k) => (
            <label key={k} className="flex items-center gap-1.5 rounded border border-slate-500/20 px-1.5 py-1">
              <input type="checkbox" checked={s.layers[k]} onChange={(e) => s.setLayers({ [k]: e.target.checked } as never)} />
              <span className="uppercase">{k}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <span className="text-[11px] uppercase tracking-widest text-slate-300/70">Model</span>
        <div className="mono mt-1 rounded border border-slate-500/20 p-1.5 text-[11px]">Swin-T + ConvLSTM</div>
      </div>
      <div>
        <span className="text-[11px] uppercase tracking-widest text-slate-300/70">Decoder</span>
        <div className="mono mt-1 rounded border border-slate-500/20 p-1.5 text-[11px]">Monotonic Neural Spline</div>
      </div>
      <fieldset>
        <legend className="text-[11px] uppercase tracking-widest text-slate-300/70">Physics</legend>
        <label className="mt-1 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={s.physics.stabOn} onChange={(e) => s.setPhysics({ stabOn: e.target.checked })} />
          Static Stability
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={s.physics.thermalOn} onChange={(e) => s.setPhysics({ thermalOn: e.target.checked })} />
          Thermal Wind Balance
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={s.physics.monotonic} onChange={(e) => s.setPhysics({ monotonic: e.target.checked })} />
          Monotonic enforced
        </label>
      </fieldset>
      <div>
        <label htmlFor="rc-mode" className="text-[11px] uppercase tracking-widest text-slate-300/70">Engine mode</label>
        <select id="rc-mode" value={s.engineMode} onChange={(e) => s.setEngineMode(e.target.value)} className="mt-1 w-full rounded border border-slate-500/30 bg-slate-950/60 p-1.5 text-xs">
          {ENGINE_MODES.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="rc-gap" className="text-[11px] uppercase tracking-widest text-slate-300/70">Gap filling</label>
        <select id="rc-gap" value={s.gapMethod} onChange={(e) => s.setGapMethod(e.target.value)} className="mt-1 w-full rounded border border-slate-500/30 bg-slate-950/60 p-1.5 text-xs">
          {GAP_METHODS.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>
      <div className="rounded border border-slate-500/20 p-2 text-[11px] text-slate-300/70" data-testid="datamode-note">
        Data mode: {s.dataMode} · Engine: {s.engine} · {s.engine === "demo" ? "synthetic inputs" : s.engine === "onnx" ? (s.onnxAvailable ? "untrained ONNX weights" : "ONNX disabled, no model file") : "Remote backend " + s.backend.state}
      </div>
    </div>
  );
}
