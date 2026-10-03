import type { EngineInput, RunResult } from "@/engine/types";
import { runDemoSync } from "@/engine/demo/engine";
self.onmessage = (e: MessageEvent) => {
  const input = e.data as EngineInput;
  try {
    const out: RunResult = runDemoSync(input);
    const transfer: unknown = {
      ...out,
      surface: {
        sst: Array.from(out.surface.sst.slice(0, 3600)),
        sss: Array.from(out.surface.sss.slice(0, 3600)),
        ssh: Array.from(out.surface.ssh.slice(0, 3600)),
        land: Array.from(out.surface.land.slice(0, 3600)),
        gap: Array.from(out.surface.gap.slice(0, 3600))
      },
      compact: true
    };
    (self as unknown as { postMessage: (v: unknown) => void }).postMessage({ ok: true, result: out, preview: transfer });
  } catch (err) {
    (self as unknown as { postMessage: (v: unknown) => void }).postMessage({ ok: false, error: String(err) });
  }
};
export {};
