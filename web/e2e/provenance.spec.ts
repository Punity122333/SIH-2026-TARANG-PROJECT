import { test, expect, type Page } from "@playwright/test";
async function demoBadgeCount(page: Page): Promise<number> {
  return page.getByTestId("demo-badge").count();
}
test("demo shows one demo badge and live shows fewer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("dashboard")).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId("recon-panel")).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId("status-chip")).toContainText("Demo", { timeout: 15000 });
  const demoCount = await demoBadgeCount(page);
  expect(demoCount).toBeGreaterThanOrEqual(1);
  const real = await page.request.post("/api/reconstruct", {
    data: { region: "bob", date: "2024-07-15", engineMode: "swin-monotonic-oi", gapMethod: "oi", dataMode: "demo" }
  });
  test.skip(!real.ok(), "backend unavailable for live stub");
  const body = await real.json();
  body.observed = ["SST (OSTIA REP)"];
  body.sourceStatus = [{ id: "OSTIA", mode: "observed", note: "SST (OSTIA REP)" }];
  body.provenance = "remote / SST (OSTIA REP) / synthetic SSS / synthetic SSH / synthetic currents / synthetic winds / untrained weights";
  await page.route("**/api/stream/reconstruct**", (r) => r.abort("failed"));
  await page.route("**/api/reconstruct", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) }));
  await page.locator("#rc-engine").selectOption("remote");
  await page.locator("#rc-datamode").selectOption("live");
  await page.getByTestId("run-btn").click();
  await expect(page.getByTestId("status-chip")).toContainText("OSTIA", { timeout: 60000 });
  await expect(page.getByTestId("untrained-notice")).toBeVisible({ timeout: 15000 });
  const liveCount = await demoBadgeCount(page);
  expect(liveCount).toBeLessThan(demoCount);
  await page.unroute("**/api/reconstruct");
  await page.unroute("**/api/stream/reconstruct**");
});
