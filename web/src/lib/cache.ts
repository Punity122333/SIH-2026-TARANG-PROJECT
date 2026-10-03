import { openDB } from "idb";
import type { RunResult, EngineInput } from "@/engine/types";
const DB = "strata";
const STORE = "runs";
export async function db() {
  return openDB(DB, 1, {
    upgrade(d) {
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
      if (!d.objectStoreNames.contains("files")) d.createObjectStore("files");
    }
  });
}
export function runKey(input: EngineInput) {
  return ["run", input.region, input.date, JSON.stringify(input.layers), input.engineMode, input.gapMethod, String(input.physics.lambda1), String(input.physics.lambda2)].join("|");
}
function slim(result: RunResult) {
  return {
    metrics: result.metrics,
    depths: result.depths,
    argo: result.argo,
    h: result.h,
    w: result.w,
    timingMs: result.timingMs,
    ingest: result.ingest,
    provenance: result.provenance,
    engineId: result.engineId
  };
}
export async function saveRun(input: EngineInput, result: RunResult) {
  try {
    const d = await db();
    await d.put(STORE, { input, slim: slim(result), at: Date.now() }, runKey(input));
  } catch {
    void 0;
  }
}
export async function listRuns(): Promise<{ key: string; at: number; provenance: string }[]> {
  try {
    const d = await db();
    const keys = await d.getAllKeys(STORE);
    const out: { key: string; at: number; provenance: string }[] = [];
    for (const k of keys) {
      try {
        const v = await d.get(STORE, k);
        out.push({ key: String(k), at: Number(v?.at || 0), provenance: String(v?.slim?.provenance || "demo") });
      } catch {
        void 0;
      }
    }
    return out;
  } catch {
    return [];
  }
}
export async function saveFile(name: string, data: Uint8Array, meta: Record<string, unknown>) {
  try {
    const d = await db();
    await d.put("files" as never, { name, data: Array.from(data.slice(0, 4096)), size: data.length, meta, at: Date.now() }, "file:" + name);
    try {
      const nav = navigator as unknown as { storage?: { getDirectory?: () => Promise<{ getFileHandle?: (n: string, o?: unknown) => Promise<{ createWritable?: () => Promise<{ write: (v: unknown) => Promise<void>; close: () => Promise<void> }> }> }> } };
      if (nav.storage && nav.storage.getDirectory) {
        const dir = await nav.storage.getDirectory();
        if (dir && dir.getFileHandle) {
          const h = await dir.getFileHandle("strata-" + name, { create: true });
          if (h && h.createWritable) {
            const wr = await h.createWritable();
            await wr.write(data);
            await wr.close();
          }
        }
      }
    } catch {
      void 0;
    }
  } catch {
    void 0;
  }
}
export async function listFiles(): Promise<{ name: string; size: number; at: number }[]> {
  try {
    const d = await db();
    const keys = await d.getAllKeys("files" as never);
    const out: { name: string; size: number; at: number }[] = [];
    for (const k of keys) {
      try {
        const v = await d.get("files" as never, k) as { name: string; size: number; at: number } | undefined;
        if (v) out.push({ name: String(v.name), size: Number(v.size), at: Number(v.at) });
      } catch {
        void 0;
      }
    }
    return out;
  } catch {
    return [];
  }
}
export async function cacheSize(): Promise<number> {
  try {
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
      const e = await navigator.storage.estimate();
      return e.usage || 0;
    }
  } catch {
    void 0;
  }
  return 0;
}
export async function clearCache() {
  try {
    const d = await db();
    await d.clear(STORE);
    try {
      await d.clear("files" as never);
    } catch {
      void 0;
    }
  } catch {
    void 0;
  }
  try {
    localStorage.removeItem("strata-session");
  } catch {
    void 0;
  }
  try {
    localStorage.removeItem("strata-upload");
    localStorage.removeItem("strata-upload-tensor");
  } catch {
    void 0;
  }
}
export async function opfsInfo(): Promise<string> {
  try {
    const nav = navigator as unknown as { storage?: { getDirectory?: () => Promise<unknown> } };
    if (nav.storage && nav.storage.getDirectory) {
      await nav.storage.getDirectory();
      return "available";
    }
    return "unavailable";
  } catch {
    return "unavailable";
  }
}
