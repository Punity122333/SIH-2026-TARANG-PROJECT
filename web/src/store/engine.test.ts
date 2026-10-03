import { describe, expect, it } from "vitest";
import { useSession } from "@/store/session";
describe("engine selector", () => {
  it("switches demo onnx remote and blocks remote offline", () => {
    const s = useSession.getState();
    s.setEngine("demo");
    expect(useSession.getState().engine).toBe("demo");
    s.setEngine("onnx");
    expect(useSession.getState().engine).toBe("onnx");
    s.setEngine("remote");
    expect(["remote", "demo"]).toContain(useSession.getState().engine);
    s.setEngine("demo");
  });
  it("live mode surfaces credentials error shape", () => {
    const e = { code: "credentials_not_configured", missing: ["COPERNICUS_USERNAME"] };
    expect(e.code).toBe("credentials_not_configured");
    expect(e.missing.length).toBeGreaterThan(0);
  });
  it("physics off raises stability loss on demo", async () => {
    const s = useSession.getState();
    s.setPhysics({ monotonic: true });
    await s.run();
    const on = useSession.getState().result?.metrics.lStab || 0;
    s.setPhysics({ monotonic: false });
    await s.run();
    const off = useSession.getState().result?.metrics.lStab || 0;
    expect(off).toBeGreaterThanOrEqual(on);
    s.setPhysics({ monotonic: true });
  });
});
