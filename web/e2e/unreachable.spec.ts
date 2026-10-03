import { test, expect } from "@playwright/test";
test("unreachable backend shows notice and one-click demo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("dashboard")).toBeVisible({ timeout: 30000 });
  await page.route("**/api/**", (r) => r.abort("failed"));
  await page.locator("#rc-engine").selectOption("remote");
  await page.getByTestId("run-btn").click();
  await expect(page.getByTestId("backend-notice")).toBeVisible({ timeout: 30000 });
  await page.getByTestId("switch-demo-btn").click();
  const eng = await page.locator("#rc-engine").inputValue();
  expect(eng).toBe("demo");
  await page.unroute("**/api/**");
  await page.getByTestId("run-btn").click();
  await expect(page.getByTestId("recon-panel")).toBeVisible({ timeout: 30000 });
});
