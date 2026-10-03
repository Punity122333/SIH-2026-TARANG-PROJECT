import { describe, expect, it, beforeEach } from "vitest";
import { useSession, restoreFromUrl } from "@/store/session";
describe("session url round trip", () => {
  beforeEach(() => {
    useSession.getState().setRegion("bob");
    useSession.getState().setDate("2024-07-15");
    useSession.getState().setDepthIndex(3);
    useSession.getState().setEngine("demo");
    try {
      const ls = window.localStorage;
      if (ls) ls.clear();
    } catch {
      void 0;
    }
  });
  it("restores valid region date depth engine mode", () => {
    window.history.replaceState(null, "", "/?region=arabian&date=2024-01-15&depth=7&engine=remote&mode=swin-mlp-oi");
    restoreFromUrl();
    const s = useSession.getState();
    expect(s.region).toBe("arabian");
    expect(s.date).toBe("2024-01-15");
    expect(s.depthIndex).toBe(7);
    expect(s.engine).toBe("remote");
    expect(s.engineMode).toBe("swin-mlp-oi");
  });
  it("ignores invalid values", () => {
    window.history.replaceState(null, "", "/?region=nope&date=bad&depth=3&engine=nope");
    restoreFromUrl();
    const s = useSession.getState();
    expect(["bob", "arabian", "indian", "custom"]).toContain(s.region);
    expect(s.date).toMatch(/2024/);
  });
  it("persists backend url in localStorage", () => {
    const s = useSession.getState();
    s.setBackendUrl("http://localhost:8000");
    expect(window.localStorage.getItem("strata-backend-url")).toBe("http://localhost:8000");
    s.setBackendUrl("");
    expect(window.localStorage.getItem("strata-backend-url")).toBeNull();
  });
  it("inputOf carries all fields", () => {
    const s = useSession.getState();
    s.setRegion("bob");
    s.setEngineMode("swin-monotonic-oi");
    s.setGapMethod("oi");
    const inp = s.inputOf();
    expect(inp.region).toBe("bob");
    expect(inp.engineMode).toBe("swin-monotonic-oi");
    expect(inp.gapMethod).toBe("oi");
    expect(inp.layers.sst).toBe(true);
    expect(inp.physics.monotonic).toBe(true);
  });
  it("cancel sets error and stops running", () => {
    const s = useSession.getState();
    s.cancel();
    expect(useSession.getState().running).toBe(false);
    expect(useSession.getState().error).toBe("Run cancelled by user");
  });
});
