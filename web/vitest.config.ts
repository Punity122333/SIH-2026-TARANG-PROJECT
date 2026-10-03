import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src")
    }
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    sequence: { shuffle: true, seed: 20260715 },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test-setup.ts", "src/types-plotly.d.ts", "src/workers/**", "src/main.tsx"],
      thresholds: { lines: 70, functions: 50, branches: 55, statements: 70 }
    }
  }
});
