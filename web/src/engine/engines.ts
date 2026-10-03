import type { EngineInput, ReconstructionEngine, RunResult } from "@/engine/types";
import { runDemoSync } from "@/engine/demo/engine";
import { remoteRun } from "@/engine/remote";
export class DemoEngine implements ReconstructionEngine {
  id = "demo";
  async run(input: EngineInput): Promise<RunResult> {
    return runDemoSync(input);
  }
}
export class OnnxEngine implements ReconstructionEngine {
  id = "onnx";
  available = false;
  reason = "ONNX weights are not configured. Export a model to OPFS to enable this path. Demo engine remains active.";
  async checkAvailable(): Promise<boolean> {
    try {
      const res = await fetch("/models/strata.onnx", { method: "HEAD" });
      if (res.ok) {
        this.available = true;
        this.reason = "ONNX weights are untrained. Results are DEMO / SIMULATED.";
        return true;
      }
    } catch {
      void 0;
    }
    try {
      const nav = navigator as unknown as { storage?: { getDirectory?: () => Promise<{ getFileHandle?: (n: string) => Promise<unknown> }> } };
      if (nav.storage && nav.storage.getDirectory) {
        const dir = await nav.storage.getDirectory();
        if (dir && typeof dir.getFileHandle === "function") {
          await dir.getFileHandle("strata.onnx");
          this.available = true;
          this.reason = "ONNX weights are untrained. Results are DEMO / SIMULATED.";
          return true;
        }
      }
    } catch {
      void 0;
    }
    this.available = false;
    this.reason = "No model file is present. Export a model to OPFS or place strata.onnx under public models to enable ONNX. Demo engine remains active.";
    return false;
  }
  run(input: EngineInput, onStage?: (s: string) => void): Promise<RunResult> {
    return new Promise((resolve, reject) => {
      try {
        const w = new Worker(new URL("@/workers/onnx.worker.ts", import.meta.url), { type: "module" });
        const to = setTimeout(() => {
          try {
            w.terminate();
          } catch {
            void 0;
          }
          reject(new Error("ONNX worker timed out"));
        }, 30000);
        w.onmessage = (e: MessageEvent) => {
          clearTimeout(to);
          try {
            w.terminate();
          } catch {
            void 0;
          }
          const d = e.data as { ok: boolean; result?: RunResult; error?: string };
          if (d.ok && d.result) {
            if (onStage) onStage("validating");
            resolve(d.result as RunResult);
          } else reject(new Error(d.error || "ONNX run failed"));
        };
        w.onerror = (err) => {
          clearTimeout(to);
          reject(new Error(String(err)));
        };
        if (onStage) onStage("embedding");
        w.postMessage(input);
      } catch (e) {
        reject(e);
      }
    });
  }
}
export class RemoteEngine implements ReconstructionEngine {
  id = "remote";
  onStage: ((s: string) => void) | null = null;
  async run(input: EngineInput): Promise<RunResult> {
    return remoteRun(input, undefined, this.onStage ? (s) => { if (this.onStage) this.onStage(s); } : undefined);
  }
  async runWithSignal(input: EngineInput, signal?: AbortSignal, onStage?: (s: string) => void): Promise<RunResult> {
    return remoteRun(input, signal, onStage);
  }
}
export function engineFor(mode: string) {
  if (mode === "onnx") return "onnx";
  if (mode === "remote") return "remote";
  return "demo";
}
export const demoEngine = new DemoEngine();
export const onnxEngine = new OnnxEngine();
export const remoteEngine = new RemoteEngine();
