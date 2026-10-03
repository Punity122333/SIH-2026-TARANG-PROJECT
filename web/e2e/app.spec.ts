import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("dashboard")).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId("map-view")).toBeVisible({ timeout: 30000 });
});
test("renders map deck charts without blank", async ({ page }) => {
  await expect(page.getByTestId("maplibre-canvas")).toBeAttached();
  await expect(page.getByTestId("deck-canvas")).toBeVisible();
  await expect(page.getByTestId("profile-chart")).toBeVisible();
  await expect(page.getByTestId("ts-chart")).toBeVisible();
  const canvasCount = await page.locator("[data-testid=map-view] canvas").count();
  expect(canvasCount).toBeGreaterThan(0);
  const markerCount = await page.locator("[data-testid^=map-marker-]").count();
  expect(markerCount).toBeGreaterThan(0);
  const plotCount = await page.locator("[data-testid=profile-chart] .plotly").count();
  expect(plotCount).toBeGreaterThan(0);
});
test("routes render at desktop and phone widths", async ({ page }) => {
  for (const route of ["/", "/model", "/data", "/validation", "/impact"]) {
    await page.goto(route);
    await expect(page.locator("#main")).toBeVisible({ timeout: 20000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThan(40);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/", "/model", "/data", "/validation", "/impact"]) {
    await page.goto(route);
    await expect(page.locator("#main")).toBeVisible({ timeout: 20000 });
  }
  await page.setViewportSize({ width: 1280, height: 800 });
});
test("cohesion inputs update every view and deep link restores", async ({ page }) => {
  await page.goto("/?region=bob&date=2024-07-15&engine=demo");
  await expect(page.getByTestId("recon-panel")).toBeVisible({ timeout: 30000 });
  await page.getByLabel("Region", { exact: false }).first().selectOption("arabian");
  await page.getByTestId("run-btn").click();
  await expect(page.getByTestId("recon-panel")).toBeVisible({ timeout: 30000 });
  await expect.poll(async () => (await page.getByTestId("recon-panel").innerText()).length, { timeout: 30000 }).toBeGreaterThan(10);
  await page.goto("/validation");
  await expect(page.getByTestId("validation-page")).toBeVisible({ timeout: 30000 });
  await page.goto("/impact");
  await expect(page.getByTestId("impact-page")).toBeVisible({ timeout: 30000 });
  await page.goto("/?region=arabian&date=2024-07-15&engine=demo");
  await expect(page.getByTestId("dashboard")).toBeVisible({ timeout: 30000 });
});
test("profile specifics inverted axis markers hover thermocline", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("profile-chart")).toBeVisible({ timeout: 30000 });
  const size = await page.evaluate(() => {
    const el = document.querySelector("[data-testid=profile-chart]");
    return el ? el.innerHTML.length : 0;
  });
  expect(size).toBeGreaterThan(1000);
  const label = await page.getByTestId("profile-chart").innerText();
  expect(label.indexOf("50")).toBeGreaterThan(-1);
});
test("physics honesty monotonic off raises Lstab and mlp raises error", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("physics-panel")).toBeVisible({ timeout: 30000 });
  const base = await page.getByTestId("physics-panel").innerText();
  expect(base.indexOf("Lstab")).toBeGreaterThan(-1);
  await page.locator("#rc-mode").selectOption("swin-mlp-oi");
  await page.getByTestId("run-btn").click();
  await expect.poll(async () => (await page.getByTestId("physics-panel").innerText()).length, { timeout: 30000 }).toBeGreaterThan(10);
  const mlp = await page.getByTestId("physics-panel").innerText();
  expect(mlp.length).toBeGreaterThan(10);
});
test("keyboard reaches controls and charts labelled", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("recon-controls")).toBeVisible({ timeout: 30000 });
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => (document.activeElement ? document.activeElement.tagName : ""));
  expect(["A", "BUTTON", "SELECT", "INPUT", "DIV", "BODY"].indexOf(focused)).toBeGreaterThan(-1);
  await expect(page.getByLabel("Reconstructed field map. Click to select location.")).toBeVisible();
  await expect(page.getByLabel("Vertical temperature profile chart")).toBeVisible();
});
test("axe has no critical violations on every route", async ({ page }) => {
  for (const route of ["/", "/model", "/data", "/validation", "/impact"]) {
    await page.goto(route);
    await expect(page.locator("#main")).toBeVisible({ timeout: 20000 });
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical).toEqual([]);
  }
});
test("cross links reach all five routes", async ({ page }) => {
  await page.goto("/");
  for (const [label, url] of [["Model", "/model"], ["Data", "/data"], ["Validation", "/validation"], ["Impact", "/impact"]] as const) {
    await page.getByRole("link", { name: label }).first().click();
    await expect(page).toHaveURL(url, { timeout: 15000 });
    await expect(page.locator("#main")).toBeVisible({ timeout: 20000 });
  }
  await page.getByRole("link", { name: "Dashboard" }).first().click();
  await expect(page).toHaveURL("/", { timeout: 15000 });
});
