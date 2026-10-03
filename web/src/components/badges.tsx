export function DemoBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      data-testid="demo-badge"
      title="Synthetic demonstration output. Not a trained scientific model result."
      className="inline-flex items-center gap-1 rounded border border-amber-300/40 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-widest text-amber-200"
    >
      <span aria-hidden="true">●</span>
      {compact ? "DEMO" : "DEMO / SIMULATED"}
    </span>
  );
}
export function StatusChip({ text, tone }: { text: string; tone: string }) {
  const live = tone === "live";
  return (
    <span
      data-testid="status-chip"
      title="Data and model provenance for the current result"
      className={
        "inline-flex max-w-full items-center gap-1 truncate rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-widest " +
        (live ? "border-cyan-300/40 bg-cyan-400/10 text-cyan-200" : "border-amber-300/40 bg-amber-400/10 text-amber-200")
      }
    >
      <span aria-hidden="true">●</span>
      <span className="truncate">{text}</span>
    </span>
  );
}
export function OfflineBadge({ online }: { online: boolean }) {
  if (online) return null;
  return (
    <span
      data-testid="offline-badge"
      title="Offline: map, cached data, reconstruction and all charts keep working. Live satellite fetch disabled."
      className="inline-flex items-center gap-1 rounded border border-cyan-300/40 bg-cyan-400/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-widest text-cyan-200"
    >
      OFFLINE MODE
    </span>
  );
}
export function LoadingState({ label }: { label: string }) {
  return <div role="status" aria-live="polite" className="p-4 text-sm text-cyan-100/70">{label}</div>;
}
export function EmptyState({ label }: { label: string }) {
  return <div className="p-4 text-sm text-slate-300/70">{label}</div>;
}
export function ErrorState({ label }: { label: string }) {
  return <div role="alert" className="rounded border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-200">{label}</div>;
}
