import { test, expect } from "@playwright/test";
test("field top edge is opaque land fill, not a transparent strip", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("dashboard")).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId("recon-panel")).toBeVisible({ timeout: 30000 });
  const canvas = page.locator('[data-testid="map-view"] canvas[aria-hidden="true"]');
  await expect.poll(async () => canvas.evaluate((c: HTMLCanvasElement) => c.width), { timeout: 30000 }).toBeGreaterThan(0);
  const top = await canvas.evaluate((c: HTMLCanvasElement) => {
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    const d = ctx.getImageData(0, 0, c.width, c.height);
    let transparent = 0;
    let landFill = 0;
    let other = 0;
    for (let i = 0; i < d.data.length; i += 4) {
      const a = d.data[i + 3];
      if (a < 250) transparent++;
      else if (d.data[i] === 13 && d.data[i + 1] === 32 && d.data[i + 2] === 54) landFill++;
      else other++;
    }
    return { transparent, landFill, other, width: c.width, rows: c.height };
  });
  expect(top).not.toBeNull();
  expect(top && top.transparent).toBe(0);
  expect(top && top.landFill).toBeGreaterThan(0);
  expect(top && top.other).toBeGreaterThan(0);
});
