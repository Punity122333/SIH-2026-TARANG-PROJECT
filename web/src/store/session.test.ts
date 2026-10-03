import { describe, expect, it } from "vitest";
import { useSession } from "@/store/session";
import { pipelineMachine } from "@/store/machine";
import { createActor } from "xstate";
describe("session store", () => {
  it("updates region and layers", () => {
    const s = useSession.getState();
    s.setRegion("arabian");
    expect(useSession.getState().region).toBe("arabian");
    s.setRegion("bob");
    s.setLayers({ ssh: false });
    expect(useSession.getState().layers.ssh).toBe(false);
    s.setLayers({ ssh: true });
  });
  it("machine walks pipeline", () => {
    const a = createActor(pipelineMachine).start();
    a.send({ type: "RUN" });
    expect(a.getSnapshot().value).toBe("ingesting");
    a.send({ type: "NEXT" });
    expect(a.getSnapshot().value).toBe("harmonizing");
  });
});
