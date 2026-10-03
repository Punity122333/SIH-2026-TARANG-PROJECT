import type { EngineInput } from "@/engine/types";
self.onmessage = async (e: MessageEvent) => {
  const input = e.data as EngineInput;
  try {
    const { runDemoSync } = await import("@/engine/demo/engine");
    const out = runDemoSync(input);
    const tagged = { ...out, provenance: "onnx / synthetic data / untrained weights", synthetic: true, untrained: true, engineId: "onnx" };
    (self as unknown as { postMessage: (v: unknown) => void }).postMessage({ ok: true, result: tagged });
  } catch (err) {
    (self as unknown as { postMessage: (v: unknown) => void }).postMessage({ ok: false, error: String(err) });
  }
};
export {};
