import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useMachine } from "@xstate/react";
import { pipelineMachine, PIPE_LABELS, PIPE_STEPS } from "@/store/machine";
import { useSession } from "@/store/session";
import { ReconstructionControls } from "@/components/ReconstructionControls";
import { StatusChip, OfflineBadge, ErrorState } from "@/components/badges";
import { statusChip } from "@/lib/provenance";
import { BackendIndicator } from "@/components/BackendIndicator";
import { useOnline, syncUrl } from "@/lib/offline";
import { REGIONS } from "@/lib/config";
import { Play, Square, Waves } from "lucide-react";
const STAGE_TO_STEP: Record<string, string> = { ingest: "ingesting", harmonize: "harmonizing", embed: "embedding", embedding: "embedding", decode: "decoding", decoding: "decoding", physics: "physics", validate: "validating", validating: "validating" };
export function AppShell() {
  const s = useSession();
  const online = useOnline();
  const nav = useNavigate();
  const [snap, send] = useMachine(pipelineMachine);
  const active = String(snap.value);
  useEffect(() => {
    syncUrl(s.region, s.date, s.depthIndex, s.engine, s.engineMode);
  }, [s.region, s.date, s.depthIndex, s.engine, s.engineMode]);
  useEffect(() => {
    void s.checkBackend();
    void s.checkOnnx();
  }, []);
  useEffect(() => {
    if (!s.result && !s.running) {
      void s.run();
    }
  }, []);
  useEffect(() => {
    void online;
  }, [online]);
  async function onRun() {
    send({ type: "RUN" });
    let first = true;
    const onStage = (stage: string) => {
      const target = STAGE_TO_STEP[stage] || stage;
      if (first && (target === "ingesting" || stage === "ingesting")) {
        first = false;
        return;
      }
      first = false;
      send({ type: "NEXT" });
    };
    await s.run(onStage);
    const cur = useSession.getState();
    if (cur.error) send({ type: "FAIL", error: cur.error });
    else send({ type: "DONE" });
  }
  function onCancel() {
    s.cancel();
    send({ type: "FAIL", error: "cancelled" });
  }
  function switchToDemo() {
    s.setEngine("demo");
    s.setBackendNotice(null);
    s.setError(null);
  }
  const idx = PIPE_STEPS.indexOf(active);
  return (
    <div className="strata-grid-bg min-h-screen">
      <a href="#main" className="sr-only">Skip to main content</a>
      <header className="sticky top-0 z-20 border-b border-cyan-200/15 bg-slate-950/90 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-cyan-400/15 text-cyan-200"><Waves size={16} /></span>
            <div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="mono text-base font-bold tracking-widest text-cyan-100">STRATA</span>
                {(() => {
                  const chip = statusChip(s.result, s.engine, s.dataMode);
                  return <StatusChip text={chip.text} tone={chip.tone} />;
                })()}
                <OfflineBadge online={online} />
                <BackendIndicator />
              </div>
              <div className="text-[11px] text-slate-300/70">Physics-Informed Subsurface Ocean Temperature Reconstruction</div>
            </div>
          </div>
          <div className="mono hidden text-[10px] text-slate-300/50 lg:block">SATELLITE OBSERVATIONS TO STRATA TO 3D SUBSURFACE TEMPERATURE TO ARGO VALIDATION</div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select aria-label="Region" value={s.region} onChange={(e) => s.setRegion(e.target.value as never)} className="rounded border border-slate-500/30 bg-slate-950/60 p-1.5 text-xs">
              {REGIONS.map((r) => (<option key={r.id} value={r.id}>{r.label}</option>))}
            </select>
            <input aria-label="Date" type="date" value={s.date} min="2000-01-01" max="2030-12-31" onChange={(e) => s.setDate(e.target.value)} className="rounded border border-slate-500/30 bg-slate-950/60 p-1.5 text-xs" />
            {!s.running ? (
              <button onClick={() => void onRun()} data-testid="run-btn" className="flex items-center gap-1 rounded bg-cyan-400/20 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/30">
                <Play size={14} /> Run Reconstruction
              </button>
            ) : (
              <button onClick={onCancel} data-testid="cancel-btn" className="flex items-center gap-1 rounded bg-rose-400/20 px-3 py-1.5 text-xs font-semibold text-rose-100 hover:bg-rose-400/30">
                <Square size={14} /> Cancel
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
          <nav aria-label="Primary" className="flex gap-1 text-xs">
            {[
              { to: "/", label: "Dashboard" },
              { to: "/model", label: "Model" },
              { to: "/data", label: "Data" },
              { to: "/validation", label: "Validation" },
              { to: "/impact", label: "Impact" }
            ].map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === "/"} className={({ isActive }) => "rounded border px-2 py-1 " + (isActive ? "border-cyan-300/60 bg-cyan-400/15 text-cyan-100" : "border-slate-500/25 text-slate-300/70")}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex flex-wrap items-center gap-1 text-[10px]" aria-label="Pipeline stepper" data-testid="pipeline-stepper">
            {PIPE_LABELS.map((label, i) => (
              <span key={label} className="flex items-center gap-1">
                <span data-testid={"step-" + PIPE_STEPS[i]} className={"rounded border px-1.5 py-0.5 tracking-widest " + (idx >= 0 && i <= idx ? "border-cyan-300/50 bg-cyan-400/15 text-cyan-100" : "border-slate-500/30 text-slate-300/50")}>{label}</span>
                {i < PIPE_LABELS.length - 1 ? <span aria-hidden="true" className="text-slate-500">·</span> : null}
              </span>
            ))}
          </div>
        </div>
        {s.backendNotice ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200" role="alert" data-testid="backend-notice">
            <span>{s.backendNotice}</span>
            <button onClick={switchToDemo} data-testid="switch-demo-btn" className="rounded border border-rose-300/50 px-2 py-0.5 text-rose-100">Switch to Demo</button>
          </div>
        ) : null}
        {s.error ? (
          <div className="px-3 pb-2" data-testid="run-error">
            <ErrorState label={s.error} />
          </div>
        ) : null}
        {s.running ? <div className="px-3 pb-2 text-[11px] text-cyan-200" role="status">Running {s.engine} engine…</div> : null}
      </header>
      <div className="grid gap-3 p-3 lg:grid-cols-[250px_1fr]">
        <aside aria-label="Session controls" className="strata-card h-fit p-3 lg:sticky lg:top-32">
          <div className="mb-2 text-[11px] uppercase tracking-widest text-slate-300/70">Session</div>
          <ReconstructionControls />
          <button onClick={() => nav("/data")} className="mt-2 w-full rounded border border-slate-500/25 px-2 py-1 text-[11px] text-slate-300/70">Open NetCDF wizard + cache</button>
        </aside>
        <main id="main" className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
