import { test, expect } from "@playwright/test";
test("remote connected streams progress and renders provenance", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("dashboard")).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId("backend-indicator")).toBeVisible({ timeout: 30000 });
  const ind = await page.getByTestId("backend-indicator").innerText();
  expect(ind.indexOf("connected") + ind.indexOf("connecting") + ind.indexOf("unreachable")).toBeGreaterThan(-3);
  await page.locator("#rc-engine").selectOption("remote");
  await page.getByTestId("run-btn").click();
  await expect(page.getByTestId("pipeline-stepper")).toBeVisible();
  await expect(page.getByTestId("recon-panel")).toContainText("remote", { timeout: 60000 });
  const panel = await page.getByTestId("recon-panel").innerText();
  expect(panel.indexOf("remote")).toBeGreaterThan(-1);
  await page.goto("/validation");
  await expect(page.getByTestId("validation-page")).toBeVisible({ timeout: 30000 });
  await page.goto("/impact");
  await expect(page.getByTestId("export-panel")).toBeVisible({ timeout: 30000 });
});
test("remote cancel recovers cleanly", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("dashboard")).toBeVisible({ timeout: 30000 });
  await page.locator("#rc-engine").selectOption("remote");
  await page.getByTestId("run-btn").click();
  await page.waitForTimeout(800);
  const cancel = page.getByTestId("cancel-btn");
  if (await cancel.isVisible()) {
    await cancel.click();
    await expect(page.getByTestId("run-error")).toBeVisible({ timeout: 15000 });
  }
  await expect(page.getByTestId("run-btn")).toBeVisible();
});
test("live without credentials shows structured error", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("dashboard")).toBeVisible({ timeout: 30000 });
  await page.locator("#rc-engine").selectOption("remote");
  await page.locator("#rc-datamode").selectOption("live");
  await page.getByTestId("run-btn").click();
  await expect(page.getByTestId("run-error")).toContainText("credentials", { timeout: 60000 });
  const msg = await page.getByTestId("run-error").innerText();
  expect(msg.indexOf("COPERNICUS_USERNAME") + msg.indexOf("Missing")).toBeGreaterThan(-2);
  await page.locator("#rc-datamode").selectOption("demo");
});
test("demo and remote share shapes and labels", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("dashboard")).toBeVisible({ timeout: 30000 });
  await page.locator("#rc-engine").selectOption("demo");
  await page.getByTestId("run-btn").click();
  await page.waitForTimeout(2000);
  const demoAll = await page.getByTestId("dashboard").innerText();
  await page.locator("#rc-engine").selectOption("remote");
  await page.getByTestId("run-btn").click();
  await expect(page.getByTestId("recon-panel")).toContainText("remote", { timeout: 60000 });
  const remoteAll = await page.getByTestId("dashboard").innerText();
  expect(demoAll.indexOf("RMSE")).toBeGreaterThan(-1);
  expect(remoteAll.indexOf("RMSE")).toBeGreaterThan(-1);
  expect(demoAll.toUpperCase().indexOf("SURFACE TEMP")).toBeGreaterThan(-1);
  expect(remoteAll.toUpperCase().indexOf("SURFACE TEMP")).toBeGreaterThan(-1);
});
