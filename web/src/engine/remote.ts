import type { EngineInput, RunResult } from "@/engine/types";
import { isValidRemotePayload, remoteToResult } from "@/engine/schema";
import { apiReconstruct, apiStreamStages } from "@/lib/api";
function toBody(input: EngineInput, upload?: number[] | null) {
  return {
    region: input.region,
    date: input.date,
    layers: { ...input.layers },
    physics: { ...input.physics },
    engineMode: input.engineMode,
    gapMethod: input.gapMethod,
    dataMode: input.dataMode || "demo",
    uploadTensor: upload || null,
    uploadShape: upload ? [120, 240] : null
  };
}
function readUpload(): number[] | null {
  try {
    const raw = localStorage.getItem("strata-upload-tensor");
    if (!raw) return null;
    const arr = JSON.parse(raw) as number[];
    if (Array.isArray(arr) && arr.length === 120 * 240) return arr;
    return null;
  } catch {
    return null;
  }
}
export async function remoteRun(input: EngineInput, signal?: AbortSignal, onStage?: (stage: string) => void): Promise<RunResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw Object.assign(new Error("Remote engine is disabled while offline. Use Demo or ONNX."), { code: "offline", status: 0 });
  }
  const upload = readUpload();
  const body = toBody(input, upload);
  if (onStage) {
    try {
      const params: Record<string, string> = { region: input.region, date: input.date, engineMode: input.engineMode, gapMethod: input.gapMethod, dataMode: input.dataMode || "demo", lambda1: String(input.physics.lambda1), lambda2: String(input.physics.lambda2) };
      const streamed = await apiStreamStages(params, (s) => {
        if (onStage) onStage(s.stage);
      }, signal);
      if (streamed && typeof streamed["reconVolume"] !== "undefined") {
        if (!isValidRemotePayload(streamed)) throw Object.assign(new Error("Remote response failed schema validation"), { code: "schema", status: 0 });
        return remoteToResult(streamed as unknown as Parameters<typeof remoteToResult>[0], input);
      }
    } catch (e) {
      const c = (e as { code?: string }).code;
      if (c === "cancelled") throw e;
      if (onStage) onStage("harmonizing");
    }
  }
  const raw = await apiReconstruct(body, signal);
  if (!isValidRemotePayload(raw)) throw Object.assign(new Error("Remote response failed schema validation"), { code: "schema", status: 0 });
  return remoteToResult(raw as unknown as Parameters<typeof remoteToResult>[0], input);
}
