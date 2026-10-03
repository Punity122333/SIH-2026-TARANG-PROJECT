import { setup, assign } from "xstate";
export type PipeState = "idle" | "ingesting" | "harmonizing" | "embedding" | "decoding" | "physics" | "validating" | "ready" | "error";
export const pipelineMachine = setup({
  types: {
    context: {} as { error: string | null },
    events: {} as { type: "RUN" } | { type: "NEXT" } | { type: "DONE" } | { type: "FAIL"; error: string } | { type: "RESET" }
  }
}).createMachine({
  id: "pipeline",
  initial: "idle",
  context: { error: null },
  states: {
    idle: { on: { RUN: "ingesting" } },
    ingesting: { on: { NEXT: "harmonizing", FAIL: "error" } },
    harmonizing: { on: { NEXT: "embedding", FAIL: "error" } },
    embedding: { on: { NEXT: "decoding", FAIL: "error" } },
    decoding: { on: { NEXT: "physics", FAIL: "error" } },
    physics: { on: { NEXT: "validating", FAIL: "error" } },
    validating: { on: { DONE: "ready", FAIL: "error" } },
    ready: { on: { RUN: "ingesting", RESET: "idle" } },
    error: {
      entry: assign({ error: () => "pipeline failed" }),
      on: { RUN: "ingesting", RESET: "idle" }
    }
  }
});
export const PIPE_STEPS = ["ingesting", "harmonizing", "embedding", "decoding", "physics", "validating", "ready"];
export const PIPE_LABELS = ["Ingest", "Harmonize", "Embed", "Decode", "Physics", "Validate", "Visualize"];
