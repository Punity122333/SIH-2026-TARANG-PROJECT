import Plot from "react-plotly.js";
import { useSession } from "@/store/session";
import { CHART_THEME } from "@/lib/theme";
import { DemoBadge } from "@/components/badges";
export function ValidationChart() {
  const s = useSession();
  const r = s.result;
  if (!r || r.argo.length === 0) return <div className="strata-card p-4 text-sm text-slate-300/60">No validation profiles yet.</div>;
  const sel = r.argo.find((a) => a.id === s.argoId) || r.argo[0];
  const idx = r.argo.indexOf(sel);
  const recon: number[] = [];
  for (let k = 0; k < r.depths.length; k++) recon.push(r.reconVolume[k * r.h * r.w + sel.row * r.w + sel.col]);
  const err = recon.map((v, i) => v - sel.truth[i]);
  return (
    <div className="strata-card p-3" data-testid="validation-chart">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-widest text-slate-300/70">ARGO {sel.id} vs STRATA · error by depth</div>
        <DemoBadge compact />
      </div>
      <div className="mt-1 flex gap-1 text-[11px]">
        {r.argo.map((a) => (
          <button
            key={a.id}
            onClick={() => {
              s.setArgoId(a.id);
              s.setSelection(a.row, a.col);
            }}
            aria-pressed={sel.id === a.id}
            className={"rounded border px-2 py-0.5 " + (sel.id === a.id ? "border-cyan-300/60 bg-cyan-400/15" : "border-slate-500/30 text-slate-300/60")}
          >
            {a.id}
          </button>
        ))}
      </div>
      <Plot
        data={[
          { x: recon, y: r.depths, type: "scatter", mode: "lines+markers", name: "STRATA " + sel.id, line: { color: "#22d3ee" } },
          { x: sel.observed, y: r.depths, type: "scatter", mode: "markers", name: "ARGO " + sel.id, marker: { color: "#fde68a" } },
          { x: err, y: r.depths, type: "scatter", mode: "lines", name: "Residual", xaxis: "x2", line: { color: "#fb7185" } }
        ]}
        layout={{
          autosize: true,
          height: 340,
          paper_bgcolor: CHART_THEME.paper,
          plot_bgcolor: CHART_THEME.paper,
          font: { color: CHART_THEME.text, size: 11 },
          xaxis: { title: { text: "Temp (°C)" }, gridcolor: CHART_THEME.grid, domain: [0, 0.62] },
          xaxis2: { title: { text: "Error (°C)" }, gridcolor: CHART_THEME.grid, domain: [0.68, 1] },
          yaxis: { title: { text: "Depth (m)" }, autorange: "reversed", gridcolor: CHART_THEME.grid },
          margin: { l: 50, r: 12, t: 10, b: 40 }
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: "100%" }}
      />
      <div className="mono text-[10px] text-slate-300/50">Profile {idx + 1} of {r.argo.length}. Selection syncs with map.</div>
    </div>
  );
}
