import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
const ROOT = new URL("../", import.meta.url).pathname;
const OUT = path.join(ROOT, "docs", "images");
const BASE = "http://localhost:4173";
const QUERY = "?region=bob&date=2024-07-15&engine=demo";
fs.mkdirSync(OUT, { recursive: true });
async function settled(page) {
  await page.getByTestId("dashboard").waitFor({ timeout: 30000 }).catch(() => undefined);
  await page.getByTestId("recon-panel").waitFor({ timeout: 30000 });
  await page.waitForFunction(() => {
    const plots = document.querySelectorAll(".plotly .main-svg").length;
    const canvas = document.querySelector('[data-testid="map-view"] canvas[aria-hidden="true"]');
    return plots >= 2 && canvas && canvas.width > 0;
  }, { timeout: 60000 });
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="ocean-3d"] svg');
    return el && el.querySelectorAll("rect").length > 10;
  }, { timeout: 60000 }).catch(() => undefined);
}
async function shot(page, route, file, full, quality) {
  await page.goto(BASE + route + QUERY, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.locator("#main").waitFor({ timeout: 20000 });
  if (route === "/") await settled(page);
  await page.screenshot({ path: path.join(OUT, file), type: "jpeg", quality: quality || 65, fullPage: full });
  console.log("captured " + file);
}
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await shot(page, "/", "dashboard.jpg", true, 58);
await page.goto(BASE + "/" + QUERY, { waitUntil: "domcontentloaded", timeout: 45000 });
await page.locator("#main").waitFor({ timeout: 20000 });
await settled(page);
await page.getByTestId("ocean-3d").scrollIntoViewIfNeeded();
await page.getByTestId("ocean-3d").screenshot({ path: path.join(OUT, "ocean3d.jpg"), type: "jpeg", quality: 82 });
console.log("captured ocean3d.jpg");
await shot(page, "/model", "model.jpg", true);
await shot(page, "/validation", "validation.jpg", true);
await shot(page, "/data", "data.jpg", true);
await shot(page, "/impact", "impact.jpg", true);
await browser.close();
