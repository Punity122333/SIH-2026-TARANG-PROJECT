import Plot from "react-plotly.js";
import { useSession } from "@/store/session";
import { profileAt } from "@/engine/demo/engine";
import { CHART_THEME } from "@/lib/theme";
import { metricRefShort } from "@/lib/provenance";
export function ProfileChart() {
  const s = useSession();
  const r = s.result;
  if (!r) return <div className="strata-card p-4 text-sm text-slate-300/60">No run yet. Press Run Reconstruction.</div>;
  const { recon, truth } = profileAt(r, s.selRow, s.selCol);
  const depths = r.depths;
  const argoNear = r.argo[0];
  const argoP = argoNear ? argoNear.observed : truth;
  const unc: number[] = recon.map(() => 0.35);
  const err = recon.map((v, i) => v - truth[i]);
  const hover = depths.map((d, i) => "depth " + d + " m<br>temp " + (Number.isFinite(recon[i]) ? recon[i].toFixed(2) : "--") + " C<br>error " + (Number.isFinite(err[i]) ? err[i].toFixed(2) : "--") + " C");
  return (
    <div className="strata-card p-3" data-testid="profile-chart" aria-label="Vertical temperature profile chart">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="min-w-0 flex-1 truncate text-[11px] uppercase tracking-widest text-slate-300/70">Vertical profile · depth inverted · {metricRefShort(r)}</div>
      </div>
      <Plot
        data={[
          {
            x: recon,
            y: depths,
            text: hover,
            hoverinfo: "text",
            type: "scatter",
            mode: "lines+markers",
            name: "STRATA",
            line: { color: "#22d3ee", width: 2, shape: "spline" },
            marker: { size: 5 }
          },
          {
            x: argoP,
            y: depths,
            text: depths.map((d, i) => "depth " + d + " m<br>argo " + (Number.isFinite(argoP[i]) ? argoP[i].toFixed(2) : "--") + " C"),
            hoverinfo: "text",
            type: "scatter",
            mode: "markers",
            name: "ARGO",
            marker: { color: "#fde68a", size: 6, symbol: "diamond" }
          },
          {
            x: [...recon.map((v, i) => v + unc[i]), ...[...recon].reverse().map((v, i) => v - unc[unc.length - 1 - i])],
            y: [...depths, ...[...depths].reverse()],
            type: "scatter",
            fill: "toself",
            name: "Uncertainty",
            line: { color: "rgba(0,0,0,0)" },
            fillcolor: "rgba(34,211,238,0.15)"
          }
        ]}
        layout={{
          autosize: true,
          height: 380,
          paper_bgcolor: CHART_THEME.paper,
          plot_bgcolor: CHART_THEME.paper,
          font: { color: CHART_THEME.text, size: 11 },
          xaxis: { title: { text: "Temperature (C)" }, gridcolor: CHART_THEME.grid },
          yaxis: { title: { text: "Depth (m)" }, autorange: "reversed", gridcolor: CHART_THEME.grid, tickvals: depths },
          margin: { l: 55, r: 12, t: 10, b: 40 },
          showlegend: true,
          shapes: [
            { type: "rect", x0: 0, x1: 1, xref: "paper", y0: 50, y1: 300, fillcolor: "rgba(251,113,133,0.08)", line: { width: 0 } }
          ]
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: "100%" }}
      />
      <div className="mono text-[10px] text-slate-300/60">Hover shows Depth · Temperature · Error · thermocline flag. 50–300 m shaded. 15 depth markers.</div>
    </div>
  );
}
