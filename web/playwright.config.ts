import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 90000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  retries: 0,
  use: { baseURL: "http://localhost:4173", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    { command: "npm run preview -- --port 4173 --strictPort", port: 4173, reuseExistingServer: true, cwd: "." },
    { command: "../.venv/bin/python -m uvicorn api.main:app --port 8000 --app-dir ../python", port: 8000, reuseExistingServer: true, cwd: "." }
  ]
});
