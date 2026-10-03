import fs from "node:fs";
import path from "node:path";
const ROOT = new URL("../", import.meta.url).pathname;
function fail(msg) {
  console.log("coverage-gate: FAIL " + msg);
  process.exit(1);
}
function pass(msg) {
  console.log("coverage-gate: PASS " + msg);
}
const frontPath = path.join(ROOT, "web", "coverage", "coverage-final.json");
if (!fs.existsSync(frontPath)) fail("missing web coverage-final.json, run vitest with --coverage first");
const front = JSON.parse(fs.readFileSync(frontPath, "utf-8"));
let coreFiles = [];
let coreCovered = 0;
let coreTotal = 0;
let allCovered = 0;
let allTotal = 0;
for (const [file, data] of Object.entries(front)) {
  const s = data.s;
  const vals = Object.values(s);
  const covered = vals.filter((v) => v > 0).length;
  const total = vals.length;
  allCovered += covered;
  allTotal += total;
  const rel = file.replace(ROOT, "");
  if (rel.indexOf("web/src/engine/demo/") >= 0) {
    coreFiles.push({ file: rel, pct: total > 0 ? covered / total : 1 });
    coreCovered += covered;
    coreTotal += total;
  }
}
const corePct = coreTotal > 0 ? (coreCovered / coreTotal) * 100 : 0;
const allPct = allTotal > 0 ? (allCovered / allTotal) * 100 : 0;
for (const c of coreFiles) {
  if (c.pct * 100 < 85) fail("core file " + c.file + " at " + (c.pct * 100).toFixed(1) + "% under 85%");
}
if (corePct < 85) fail("core engine aggregate " + corePct.toFixed(1) + "% under 85%");
if (allPct < 70) fail("overall frontend " + allPct.toFixed(1) + "% under 70%");
pass("frontend core " + corePct.toFixed(1) + "% overall " + allPct.toFixed(1) + "%");
