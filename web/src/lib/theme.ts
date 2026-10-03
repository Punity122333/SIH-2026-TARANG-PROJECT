export const CHART_THEME = {
  bg: "rgba(0,0,0,0)",
  paper: "#061224",
  grid: "rgba(120,180,255,0.14)",
  text: "#cfe6ff",
  accent: "#22d3ee",
  warm: "#fb7185",
  cool: "#38bdf8"
};
export const TEMP_COLORS = ["#082f49", "#0c4a6e", "#0284c7", "#22d3ee", "#fde68a", "#fb7185"];
export function tempColor(t: number, tMin: number, tMax: number): [number, number, number, number] {
  const f = Math.min(1, Math.max(0, (t - tMin) / Math.max(1e-6, tMax - tMin)));
  const r = Math.round(8 + f * 240);
  const g = Math.round(60 + f * 120);
  const b = Math.round(140 - f * 60);
  return [r, g, b, 200];
}
export const UNITS = {
  temp: "°C",
  sal: "PSU",
  ssh: "m",
  depth: "m",
  uohc: "10⁸ J/m²",
  rmse: "°C",
  bias: "°C",
  thermoErr: "m"
};
