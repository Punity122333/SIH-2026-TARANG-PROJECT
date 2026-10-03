import { useState } from "react";
import Plot from "react-plotly.js";
import { useSession } from "@/store/session";
import { profileAt } from "@/engine/demo/engine";
import { CHART_THEME } from "@/lib/theme";
export function TSChart() {
  const s = useSession();
  const [band, setBand] = useState("all");
  const r = s.result;
  if (!r) return <div className="strata-card p-4 text-sm text-slate-300/60">No run yet.</div>;
  const { recon, sal } = profileAt(r, s.selRow, s.selCol);
  const depths = r.depths;
  const idx = depths.map((d, i) => ({ d, i })).filter((x) => {
    if (band === "surface") return x.d <= 50;
    if (band === "thermocline") return x.d > 50 && x.d <= 300;
    if (band === "deep") return x.d > 300;
    return true;
  }).map((x) => x.i);
  return (
    <div className="strata-card p-3" data-testid="ts-chart">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="min-w-0 flex-1 truncate text-[11px] uppercase tracking-widest text-slate-300/70">T–S diagram</div>
      </div>
      <div className="mt-1 flex gap-1 text-[11px]">
        {(["all", "surface", "thermocline", "deep"] as const).map((b) => (
          <button key={b} onClick={() => setBand(b)} aria-pressed={band === b} className={"rounded border px-2 py-0.5 " + (band === b ? "border-cyan-300/60 bg-cyan-400/15 text-cyan-100" : "border-slate-500/30 text-slate-300/70")}>
            {b}
          </button>
        ))}
      </div>
      <Plot
        data={[
          {
            x: idx.map((i) => sal[i]),
            y: idx.map((i) => recon[i]),
            type: "scatter",
            mode: "markers+lines",
            name: "Selected profile",
            marker: { color: "#22d3ee", size: 7 }
          }
        ]}
        layout={{
          autosize: true,
          height: 300,
          paper_bgcolor: CHART_THEME.paper,
          plot_bgcolor: CHART_THEME.paper,
          font: { color: CHART_THEME.text, size: 11 },
          xaxis: { title: { text: "Salinity (PSU)" }, gridcolor: CHART_THEME.grid },
          yaxis: { title: { text: "Temperature (°C)" }, gridcolor: CHART_THEME.grid },
          margin: { l: 50, r: 12, t: 10, b: 40 }
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: "100%" }}
      />
    </div>
  );
}
