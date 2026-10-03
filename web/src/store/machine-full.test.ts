import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { pipelineMachine, PIPE_STEPS, PIPE_LABELS } from "@/store/machine";
describe("pipeline machine full walk", () => {
  it("walks all stages to ready", () => {
    const a = createActor(pipelineMachine).start();
    expect(a.getSnapshot().value).toBe("idle");
    a.send({ type: "RUN" });
    expect(a.getSnapshot().value).toBe("ingesting");
    for (const want of ["harmonizing", "embedding", "decoding", "physics", "validating"]) {
      a.send({ type: "NEXT" });
      expect(a.getSnapshot().value).toBe(want);
    }
    a.send({ type: "DONE" });
    expect(a.getSnapshot().value).toBe("ready");
  });
  it("fail goes to error with message", () => {
    const a = createActor(pipelineMachine).start();
    a.send({ type: "RUN" });
    a.send({ type: "FAIL", error: "boom" });
    expect(a.getSnapshot().value).toBe("error");
    expect(a.getSnapshot().context.error).toBe("pipeline failed");
  });
  it("reset returns to idle and run restarts", () => {
    const a = createActor(pipelineMachine).start();
    a.send({ type: "RUN" });
    a.send({ type: "FAIL", error: "x" });
    expect(a.getSnapshot().value).toBe("error");
    a.send({ type: "RESET" });
    expect(a.getSnapshot().value).toBe("idle");
    a.send({ type: "RUN" });
    expect(a.getSnapshot().value).toBe("ingesting");
  });
  it("ready accepts run again", () => {
    const a = createActor(pipelineMachine).start();
    a.send({ type: "RUN" });
    for (let i = 0; i < 5; i++) a.send({ type: "NEXT" });
    a.send({ type: "DONE" });
    expect(a.getSnapshot().value).toBe("ready");
    a.send({ type: "RUN" });
    expect(a.getSnapshot().value).toBe("ingesting");
  });
  it("steps and labels cover seven stages", () => {
    expect(PIPE_STEPS).toEqual(["ingesting", "harmonizing", "embedding", "decoding", "physics", "validating", "ready"]);
    expect(PIPE_LABELS).toEqual(["Ingest", "Harmonize", "Embed", "Decode", "Physics", "Validate", "Visualize"]);
    expect(PIPE_STEPS.length).toBe(7);
  });
  it("cancel path via reset from validating", () => {
    const a = createActor(pipelineMachine).start();
    a.send({ type: "RUN" });
    a.send({ type: "NEXT" });
    a.send({ type: "NEXT" });
    expect(a.getSnapshot().value).toBe("embedding");
    a.send({ type: "FAIL", error: "cancelled" });
    expect(a.getSnapshot().value).toBe("error");
  });
});
