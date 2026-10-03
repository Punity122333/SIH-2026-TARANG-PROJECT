import { useState } from "react";
import { useSession } from "@/store/session";
import { parseUpload, validateMapping, type DetectedVar } from "@/lib/ingest";
import { saveFile } from "@/lib/cache";
export function IngestPanel() {
  const s = useSession();
  const [fileName, setFileName] = useState("");
  const [vars, setVars] = useState<DetectedVar[]>([]);
  const [mapped, setMapped] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("Upload a NetCDF file to begin guided ingest.");
  const [valid, setValid] = useState(false);
  const r = s.result;
  async function onFile(f: File | undefined) {
    if (!f) return;
    setMessage("Reading " + f.name + "…");
    try {
      const out = await parseUpload(f);
      setFileName(out.fileName);
      setVars(out.vars);
      setMapped(out.mapped);
      setMessage(out.message);
      setValid(out.valid);
      try {
        const buf = new Uint8Array(await f.arrayBuffer());
        await saveFile(f.name, buf, { mapped: out.mapped });
        if (out.tensor) localStorage.setItem("strata-upload-tensor", JSON.stringify(out.tensor));
        localStorage.setItem("strata-upload", JSON.stringify({ fileName: out.fileName, mapped: out.mapped, at: Date.now() }));
      } catch {
        void 0;
      }
    } catch {
      setMessage("Could not read file. Try another NetCDF export.");
      setValid(false);
    }
  }
  function setMap(kind: string, vname: string) {
    const next = { ...mapped };
    if (vname.length === 0) delete next[kind];
    else next[kind] = vname;
    setMapped(next);
    const v = validateMapping(next);
    setValid(v.valid);
    setMessage(v.message);
  }
  return (
    <div className="strata-card p-3" data-testid="ingest-panel">
      <div className="text-[11px] uppercase tracking-widest text-slate-300/70">Stage 1 · Ingest</div>
      <div className="mt-2 space-y-1.5 text-xs">
        {(r?.ingest || []).map((g) => (
          <div key={g.id} className="flex items-center justify-between rounded border border-slate-500/20 px-2 py-1">
            <span className="mono">{g.id}</span>
            <span className="mono text-cyan-100">{g.missingPct.toFixed(1)}% missing</span>
          </div>
        ))}
      </div>
      <div className="mt-2 rounded border border-slate-500/20 p-2">
        <div className="text-[11px] uppercase tracking-widest text-slate-300/70">Guided NetCDF ingest</div>
        <label className="mt-1 block text-xs">
          Upload NetCDF
          <input
            aria-label="Upload NetCDF"
            type="file"
            accept=".nc,.cdf,.h5,.hdf5"
            onChange={(e) => void onFile(e.target.files?.[0])}
            className="mt-1 block w-full text-[11px]"
          />
        </label>
        {fileName ? <div className="mono mt-1 text-[11px] text-cyan-100" data-testid="ingest-detected">Detected: {fileName} · {vars.map((v) => v.name + "(" + v.kind + ")").join(", ")}</div> : null}
        <div className="mt-1 grid grid-cols-1 gap-1 text-xs">
          {["SST", "SSS", "SSH", "Currents", "Winds"].map((kind) => (
            <label key={kind} className="block">
              <span className="text-[11px] text-slate-300/70">Map {kind}</span>
              <select value={mapped[kind] || ""} onChange={(e) => setMap(kind, e.target.value)} aria-label={"Map " + kind} className="mt-0.5 w-full rounded border border-slate-500/30 bg-slate-950/60 p-1 text-xs">
                <option value="">unmapped</option>
                {vars.map((v) => (
                  <option key={v.name} value={v.name}>{v.name}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="mono mt-1 text-[11px] text-slate-300/60" data-testid="ingest-message">{message}</div>
        <button
          onClick={() => {
            const v = validateMapping(mapped);
            setValid(v.valid);
            setMessage(v.message);
            if (!v.valid) return;
            try {
              localStorage.setItem("strata-upload", JSON.stringify({ fileName, mapped, at: Date.now() }));
            } catch {
              void 0;
            }
            void s.run();
          }}
          disabled={!valid && vars.length > 0}
          className="mt-2 w-full rounded bg-cyan-400/20 px-2 py-1 text-xs text-cyan-100 disabled:opacity-40"
          data-testid="ingest-use-btn"
        >
          Validate + cache + use in pipeline
        </button>
      </div>
    </div>
  );
}
