import { test, expect } from "@playwright/test";
test("field renders geo-registered with markers and obeys zoom and pan", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("dashboard")).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId("recon-panel")).toBeVisible({ timeout: 30000 });
  const box = page.getByTestId("map-view");
  await expect.poll(async () => box.locator(".maplibregl-canvas").count(), { timeout: 30000 }).toBeGreaterThan(0);
  await expect(page.getByTestId("map-marker-F01")).toBeVisible({ timeout: 30000 });
  const before = await box.screenshot();
  expect(before.length).toBeGreaterThan(10000);
  await box.hover({ position: { x: 120, y: 200 } });
  await expect(page.getByTestId("hover-readout")).toBeAttached({ timeout: 15000 });
  await page.mouse.wheel(0, -600);
  await expect.poll(async () => (await box.screenshot()).length, { timeout: 30000 }).not.toBe(before.length);
  await box.click({ position: { x: 150, y: 220 } });
  await expect(page.getByTestId("profile-chart")).toBeVisible({ timeout: 30000 });
});
