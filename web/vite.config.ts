import path from "node:path";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff,woff2,ttf,pmtiles,json,onnx}"],
        navigateFallback: "index.html",
        maximumFileSizeToCacheInBytes: 12000000,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.indexOf("/models/") === 0,
            handler: "CacheFirst",
            options: { cacheName: "strata-models", expiration: { maxEntries: 8, maxAgeSeconds: 2592000 } }
          },
          {
            urlPattern: ({ url }) => url.pathname.indexOf("/tiles/") === 0,
            handler: "CacheFirst",
            options: { cacheName: "strata-tiles", expiration: { maxEntries: 8, maxAgeSeconds: 2592000 } }
          },
          {
            urlPattern: ({ url }) => url.pathname.indexOf("/data/") === 0,
            handler: "CacheFirst",
            options: { cacheName: "strata-data", expiration: { maxEntries: 16, maxAgeSeconds: 2592000 } }
          }
        ]
      },
      manifest: {
        name: "STRATA",
        short_name: "STRATA",
        start_url: ".",
        display: "standalone",
        background_color: "#040b18",
        theme_color: "#040b18"
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src")
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 4173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true
      }
    }
  },
  worker: {
    format: "es"
  },
  build: {
    outDir: "dist",
    sourcemap: false
  }
});
