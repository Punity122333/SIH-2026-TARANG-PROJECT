import fs from "node:fs";
import path from "node:path";
const ROOT = new URL("../", import.meta.url).pathname;
const OUT_DIR = path.join(ROOT, "scripts", "data");
const OUT = path.join(OUT_DIR, "ne-coast.geojson");
const SOURCES = [
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_coastline.geojson",
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_coastline.geojson"
];
const features = [];
for (const url of SOURCES) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("fetch failed " + url + " status " + res.status);
  const gj = await res.json();
  for (const f of gj.features) {
    features.push({ type: "Feature", properties: { source: "Natural Earth", scale: url.includes("50m") ? "1:50m" : "1:110m" }, geometry: f.geometry });
  }
}
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ type: "FeatureCollection", features }));
console.log("coast features=" + features.length + " bytes=" + fs.statSync(OUT).size);
