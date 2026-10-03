import { create } from "zustand";
import type { EngineInput, LayerToggles, PhysicsConfig, RunResult, EngineId } from "@/engine/types";
import type { RegionId } from "@/lib/config";
import { runDemoSync } from "@/engine/demo/engine";
import { onnxEngine, remoteEngine } from "@/engine/engines";
export type BackendState = "connected" | "connecting" | "unreachable" | "unknown";
export interface BackendInfo {
  state: BackendState;
  latencyMs: number | null;
  version: string | null;
}
export interface SessionState {
  region: RegionId;
  date: string;
  layers: LayerToggles;
  physics: PhysicsConfig;
  engineMode: string;
  gapMethod: string;
  engine: EngineId;
  dataMode: string;
  backendUrl: string;
  backend: BackendInfo;
  backendNotice: string | null;
  depthIndex: number;
  selRow: number;
  selCol: number;
  argoId: string | null;
  diagnostic: string;
  result: RunResult | null;
  running: boolean;
  error: string | null;
  runtimeMs: number | null;
  onnxAvailable: boolean;
  onnxReason: string;
  setRegion: (v: RegionId) => void;
  setDate: (v: string) => void;
  setLayers: (v: Partial<LayerToggles>) => void;
  setPhysics: (v: Partial<PhysicsConfig>) => void;
  setEngineMode: (v: string) => void;
  setGapMethod: (v: string) => void;
  setEngine: (v: EngineId) => void;
  setDataMode: (v: string) => void;
  setBackendUrl: (v: string) => void;
  setBackend: (v: Partial<BackendInfo>) => void;
  setBackendNotice: (v: string | null) => void;
  setDepthIndex: (v: number) => void;
  setSelection: (row: number, col: number) => void;
  setArgoId: (v: string | null) => void;
  setDiagnostic: (v: string) => void;
  setResult: (r: RunResult | null) => void;
  setRunning: (v: boolean) => void;
  setError: (v: string | null) => void;
  setOnnx: (a: boolean, r: string) => void;
  cancel: () => void;
  checkBackend: () => Promise<void>;
  checkOnnx: () => Promise<void>;
  run: (onStage?: (s: string) => void) => Promise<void>;
  inputOf: () => EngineInput;
}
const defaults = {
  region: "bob" as RegionId,
  date: "2024-07-15",
  layers: { sst: true, sss: true, ssh: true, currents: true, winds: true },
  physics: { lambda1: 0.8, lambda2: 0.4, stabOn: true, thermalOn: true, monotonic: true },
  engineMode: "swin-monotonic-oi",
  gapMethod: "oi",
  engine: "demo" as EngineId,
  dataMode: "demo",
  backendUrl: "",
  depthIndex: 3,
  selRow: 60,
  selCol: 120,
  argoId: null as string | null,
  diagnostic: "sst"
};
let abortRef: AbortController | null = null;
export const useSession = create<SessionState>((set, get) => ({
  ...defaults,
  backend: { state: "unknown" as BackendState, latencyMs: null, version: null },
  backendNotice: null,
  result: null,
  running: false,
  error: null,
  runtimeMs: null,
  onnxAvailable: false,
  onnxReason: "No model file is present. Export a model to OPFS or place strata.onnx under public models to enable ONNX. Demo engine remains active.",
  setRegion: (region) => set({ region }),
  setDate: (date) => set({ date }),
  setLayers: (v) => set((s) => ({ layers: { ...s.layers, ...v } })),
  setPhysics: (v) => set((s) => ({ physics: { ...s.physics, ...v } })),
  setEngineMode: (engineMode) => set({ engineMode }),
  setGapMethod: (gapMethod) => set({ gapMethod }),
  setEngine: (engine) => {
    set({ engine, error: null });
  },
  setDataMode: (dataMode) => set({ dataMode }),
  setBackendUrl: (backendUrl) => {
    try {
      if (backendUrl.length === 0) localStorage.removeItem("strata-backend-url");
      else localStorage.setItem("strata-backend-url", backendUrl);
    } catch {
      void 0;
    }
    set({ backendUrl });
  },
  setBackend: (v) => set((s) => ({ backend: { ...s.backend, ...v } })),
  setBackendNotice: (backendNotice) => set({ backendNotice }),
  setDepthIndex: (depthIndex) => set({ depthIndex }),
  setSelection: (selRow, selCol) => set({ selRow, selCol }),
  setArgoId: (argoId) => set({ argoId }),
  setDiagnostic: (diagnostic) => set({ diagnostic }),
  setResult: (result) => set({ result }),
  setRunning: (running) => set({ running }),
  setError: (error) => set({ error }),
  setOnnx: (onnxAvailable, onnxReason) => set({ onnxAvailable, onnxReason }),
  cancel: () => {
    if (abortRef) {
      try {
        abortRef.abort();
      } catch {
        void 0;
      }
    }
    set({ running: false, error: "Run cancelled by user" });
  },
  checkBackend: async () => {
    const s = get();
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      set({ backend: { state: "unreachable", latencyMs: null, version: null } });
      return;
    }
    set({ backend: { ...s.backend, state: "connecting" } });
    const t0 = performance.now();
    try {
      const mod = await import("@/lib/api");
      const h = await mod.apiHealth();
      const t1 = performance.now();
      set({ backend: { state: "connected", latencyMs: Math.round(t1 - t0), version: h.version || null }, backendNotice: null });
    } catch {
      set((prev) => {
        const was = prev.backend.state;
        return { backend: { state: "unreachable", latencyMs: null, version: null }, backendNotice: was === "connected" ? "Backend unreachable. Switch to Demo to continue offline." : prev.backendNotice };
      });
    }
  },
  checkOnnx: async () => {
    try {
      const ok = await onnxEngine.checkAvailable();
      set({ onnxAvailable: ok, onnxReason: onnxEngine.reason });
    } catch {
      void 0;
    }
  },
  inputOf: () => {
    const s = get();
    return { region: s.region, date: s.date, layers: s.layers, physics: s.physics, engineMode: s.engineMode, gapMethod: s.gapMethod, dataMode: s.dataMode };
  },
  run: async (onStage) => {
    const s = get();
    if (s.running && abortRef) {
      try {
        abortRef.abort();
      } catch {
        void 0;
      }
    }
    if (typeof navigator !== "undefined" && !navigator.onLine && s.engine === "remote") {
      set({ error: "Remote engine is disabled while offline. Use Demo or ONNX.", running: false });
      return;
    }
    if (s.engine === "onnx" && !s.onnxAvailable) {
      set({ error: s.onnxReason, running: false });
      return;
    }
    abortRef = new AbortController();
    const sig = abortRef.signal;
    set({ running: true, error: null });
    const t0 = performance.now();
    try {
      let out: RunResult;
      if (s.engine === "remote") {
        out = await remoteEngine.runWithSignal(s.inputOf(), sig, onStage);
      } else if (s.engine === "onnx") {
        if (onStage) onStage("embedding");
        const { runDemoSync: demoSync } = await import("@/engine/demo/engine");
        out = demoSync(s.inputOf());
        const { onnxProvenance } = await import("@/lib/provenance");
        out = { ...out, provenance: "onnx / synthetic data / untrained weights", prov: onnxProvenance(), synthetic: true, untrained: true, engineId: "onnx" };
        if (onStage) onStage("validating");
      } else {
        if (onStage) {
          onStage("ingesting");
          await new Promise((r) => setTimeout(r, 30));
          if (sig.aborted) throw Object.assign(new Error("cancelled"), { code: "cancelled" });
          onStage("harmonizing");
        }
        out = runDemoSync(s.inputOf());
        if (onStage) {
          for (const st of ["embedding", "decoding", "physics", "validating"]) {
            if (sig.aborted) throw Object.assign(new Error("cancelled"), { code: "cancelled" });
            onStage(st);
            await new Promise((r) => setTimeout(r, 30));
          }
        }
      }
      const t1 = performance.now();
      if (sig.aborted) throw Object.assign(new Error("cancelled"), { code: "cancelled" });
      set({ result: out, running: false, runtimeMs: t1 - t0, error: null });
      try {
        const mod = await import("@/lib/cache");
        await mod.saveRun(s.inputOf(), out);
      } catch {
        void 0;
      }
    } catch (e) {
      const err = e as { code?: string; message?: string; status?: number; missing?: string[] };
      if (err && (err.code === "cancelled" || (err.message && err.message.indexOf("cancel") >= 0))) {
        set({ running: false, error: "Run cancelled by user" });
        return;
      }
      let msg = String((err && err.message) || e);
      if (err && err.code === "credentials_not_configured") {
        const miss = err.missing ? err.missing.join(", ") : "";
        msg = "Live data credentials are not configured on the server. Missing: " + miss;
      }
      if (err && err.code === "offline") msg = "Remote engine is disabled while offline. Use Demo or ONNX.";
      if (err && err.code === "schema") msg = "Remote response failed schema validation";
      set({ running: false, error: msg });
      if (s.engine === "remote") {
        set({ backend: { state: "unreachable", latencyMs: null, version: null }, backendNotice: "Backend unreachable. Switch to Demo to continue offline." });
      }
    } finally {
      abortRef = null;
    }
  }
}));
export function restoreFromUrl() {
  try {
    const q = new URLSearchParams(window.location.search);
    const st = useSession.getState();
    const region = q.get("region");
    const date = q.get("date");
    const depth = q.get("depth");
    const engine = q.get("engine");
    const mode = q.get("mode");
    if (region === "bob" || region === "arabian" || region === "indian" || region === "custom") st.setRegion(region);
    if (date && date.match(/^\d{4}-\d{2}-\d{2}$/)) st.setDate(date);
    if (depth && !Number.isNaN(Number(depth))) st.setDepthIndex(Number(depth));
    if (engine === "demo" || engine === "onnx" || engine === "remote") {
      st.setEngine(engine);
    }
    if (mode) st.setEngineMode(mode);
    const saved = localStorage.getItem("strata-backend-url");
    if (saved) st.setBackendUrl(saved);
  } catch {
    void 0;
  }
}
