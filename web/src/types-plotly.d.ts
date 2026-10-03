declare module "react-plotly.js" {
  import * as React from "react";
  const Plot: React.ComponentType<Record<string, unknown>>;
  export default Plot;
}
declare module "virtual:pwa-register" {
  export function registerSW(options?: Record<string, unknown>): void;
}
