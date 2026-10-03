import { useState } from "react";
import { SOURCES } from "@/lib/config";
import { DataSourceCard } from "@/components/DataCards";
import { cacheSize, clearCache, opfsInfo, listFiles, listRuns } from "@/lib/cache";
export function DataPage() {
  const [info, setInfo] = useState("—");
  const [opfs, setOpfs] = useState("—");
  const [files, setFiles] = useState<{ name: string; size: number; at: number }[]>([]);
  const [runs, setRuns] = useState<{ key: string; at: number; provenance: string }[]>([]);
  async function refresh() {
    setInfo(String(Math.round((await cacheSize()) / 1024)) + " KB estimated");
    setOpfs(await opfsInfo());
    setFiles(await listFiles());
    setRuns(await listRuns());
  }
  return (
    <div className="space-y-3" data-testid="data-page">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {SOURCES.map((x) => (
          <DataSourceCard key={x.id} id={x.id} />
        ))}
      </div>
      <div className="strata-card p-3 text-xs">
        <div className="text-[11px] uppercase tracking-widest text-slate-300/70">Cache manager · IndexedDB / OPFS</div>
        <div className="mono mt-1">usage {info} · opfs {opfs}</div>
        <div className="mt-2 flex gap-2">
          <button onClick={() => void refresh()} className="rounded border border-slate-500/30 px-2 py-1" data-testid="cache-refresh">Refresh sizes</button>
          <button onClick={() => void clearCache().then(() => void refresh())} className="rounded border border-rose-400/40 px-2 py-1 text-rose-200" data-testid="cache-clear">Clear cache</button>
        </div>
        <div className="mt-2">
          <div className="text-[11px] uppercase tracking-widest text-slate-300/70">Cached files ({files.length})</div>
          {files.length === 0 ? <div className="mono mt-1 text-slate-300/60" data-testid="cache-empty">No cached files yet. Upload NetCDF to populate.</div> : null}
          <div className="mt-1 space-y-1">
            {files.map((f) => (
              <div key={f.name} className="mono flex justify-between rounded border border-slate-500/20 px-2 py-1"><span>{f.name}</span><span>{Math.round(f.size / 1024)} KB</span></div>
            ))}
          </div>
        </div>
        <div className="mt-2">
          <div className="text-[11px] uppercase tracking-widest text-slate-300/70">Cached runs ({runs.length})</div>
          <div className="mt-1 space-y-1">
            {runs.slice(0, 8).map((x) => (
              <div key={x.key} className="mono truncate rounded border border-slate-500/20 px-2 py-1 text-[10px]">{x.key} · {x.provenance}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
