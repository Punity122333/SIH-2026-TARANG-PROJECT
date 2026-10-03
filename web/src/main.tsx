import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "@/routes/router";
import "@/index.css";
import { useUrlSync } from "@/lib/offline";
function Boot() {
  useUrlSync();
  return <RouterProvider router={router} />;
}
const el = document.getElementById("root");
if (el) {
  ReactDOM.createRoot(el).render(
    <React.StrictMode>
      <Boot />
    </React.StrictMode>
  );
}
try {
  const w = window as unknown as { __strata_sw?: boolean };
  if (!w.__strata_sw && "serviceWorker" in navigator && (window.location.protocol === "https:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    w.__strata_sw = true;
    void import("virtual:pwa-register").then((m) => {
      try {
        const fn = (m as unknown as { registerSW?: (o?: unknown) => void }).registerSW;
        if (fn) fn({ immediate: true });
      } catch {
        void 0;
      }
    }).catch(() => {
      void 0;
    });
  }
} catch {
  void 0;
}
