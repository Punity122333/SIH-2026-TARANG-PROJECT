import type { EngineInput, ReconstructionEngine, RunResult } from "@/engine/types";
import { runDemoSync } from "@/engine/demo/engine";
export class DemoEngine implements ReconstructionEngine {
  id = "demo";
  async run(input: EngineInput): Promise<RunResult> {
    return runDemoSync(input);
  }
}
export const demoEngine = new DemoEngine();
