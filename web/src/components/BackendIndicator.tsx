import { useEffect } from "react";
import { useSession } from "@/store/session";
import { useOnline } from "@/lib/offline";
export function BackendIndicator() {
  const backend = useSession((s) => s.backend);
  const checkBackend = useSession((s) => s.checkBackend);
  const online = useOnline();
  useEffect(() => {
    void checkBackend();
    const t = setInterval(() => {
      void checkBackend();
    }, 15000);
    return () => clearInterval(t);
  }, [checkBackend]);
  useEffect(() => {
    void checkBackend();
  }, [online, checkBackend]);
  if (!online) return <span data-testid="backend-indicator" className="mono rounded border border-slate-500/30 px-1.5 py-0.5 text-[10px] text-slate-300/60">backend unreachable · offline</span>;
  if (backend.state === "connected") return <span data-testid="backend-indicator" className="mono rounded border border-emerald-300/40 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] text-emerald-200">connected · {backend.latencyMs}ms · v{backend.version}</span>;
  if (backend.state === "connecting") return <span data-testid="backend-indicator" className="mono rounded border border-amber-300/40 px-1.5 py-0.5 text-[10px] text-amber-200">connecting…</span>;
  return <span data-testid="backend-indicator" className="mono rounded border border-rose-400/40 bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-200">unreachable</span>;
}
