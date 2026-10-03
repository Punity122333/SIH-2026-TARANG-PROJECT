import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { formatNum, clamp, lonLatToGrid, gridToLonLat, cn } from "@/lib/utils";
import { detectVars, defaultMapping, validateMapping, parseUpload } from "@/lib/ingest";
import { profileCsv, fieldCsv, fieldNetcdf } from "@/lib/export";
import { runKey } from "@/lib/cache";
import { syncUrl } from "@/lib/offline";
import { backendBase, apiUrl, toApiError, setBackendUrl } from "@/lib/api";
import { engineFor, demoEngine } from "@/engine/engines";
import { runDemoSync } from "@/engine/demo/engine";
import { ReconstructionControls } from "@/components/ReconstructionControls";
import { ModelExplorer } from "@/components/ModelExplorer";
import { HarmonizePanel } from "@/components/HarmonizePanel";
import { IngestPanel } from "@/components/IngestPanel";
import { PipelineDiagram } from "@/components/PipelineDiagram";
import { BackendIndicator } from "@/components/BackendIndicator";
import { TSChart } from "@/components/TSChart";
import { ValidationChart } from "@/components/ValidationChart";
import { Ocean3DView } from "@/components/Ocean3DView";
import { ModelPage } from "@/routes/Model";
import { DataPage } from "@/routes/Data";
import { ValidationPage } from "@/routes/Validation";
import { ImpactPage } from "@/routes/Impact";
import { useSession } from "@/store/session";
vi.mock("react-plotly.js", () => ({
  default: () => <div data-testid="plotly-mock">mock</div>
}));
function baseInput() {
  return {
    region: "bob" as const,
    date: "2024-07-15",
    layers: { sst: true, sss: true, ssh: true, currents: true, winds: true },
    physics: { lambda1: 0.8, lambda2: 0.4, stabOn: true, thermalOn: true, monotonic: true },
    engineMode: "swin-monotonic-oi",
    gapMethod: "oi"
  };
}
describe("utils coverage", () => {
  it("formatNum handles finite and nonfinite", () => {
    expect(formatNum(1.23456)).toBe("1.23");
    expect(formatNum(1.23456, 3)).toBe("1.235");
    expect(formatNum(NaN)).toBe("Not specified");
    expect(formatNum(Infinity)).toBe("Not specified");
  });
  it("clamp bounds values", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
  it("grid lonlat round trips inside bounds", () => {
    const region = { latMin: 5, latMax: 22, lonMin: 80, lonMax: 95 };
    const g = lonLatToGrid(87, 12, region, 120, 240);
    expect(g.row).toBeGreaterThanOrEqual(0);
    expect(g.col).toBeGreaterThanOrEqual(0);
    const ll = gridToLonLat(g.row, g.col, region, 120, 240);
    expect(ll.lat).toBeGreaterThan(4);
    expect(ll.lon).toBeGreaterThan(79);
    expect(cn("a", "b")).toContain("a");
  });
});
describe("ingest coverage", () => {
  it("detects all kinds and defaults", () => {
    const v = detectVars(["thetao_temp", "SSS_salt", "zos", "uo_cur", "vo", "uas_wind", "mystery"]);
    const kinds = v.map((x) => x.kind);
    expect(kinds).toContain("SST");
    expect(kinds).toContain("SSS");
    expect(kinds).toContain("SSH");
    expect(kinds).toContain("Currents");
    expect(kinds).toContain("Winds");
    expect(kinds).toContain("unknown");
    const m = defaultMapping(v);
    expect(m["SST"]).toBeTruthy();
    expect(validateMapping({ SST: "a", SSS: "b", SSH: "c" }).valid).toBe(true);
    expect(validateMapping({}).valid).toBe(false);
  });
  it("parseUpload builds tensor", async () => {
    const f = new File(["thetao so zos uo vo wind"], "sample.nc", { type: "application/octet-stream" });
    const withBuf = f as unknown as { arrayBuffer: () => Promise<ArrayBuffer> };
    withBuf.arrayBuffer = async () => new TextEncoder().encode("thetao so zos uo vo wind").buffer as ArrayBuffer;
    const out = await parseUpload(f);
    expect(out.fileName).toBe("sample.nc");
    expect(out.vars.length).toBeGreaterThan(0);
    expect(out.tensor).not.toBeNull();
    expect((out.tensor as number[]).length).toBe(120 * 240);
  });
});
describe("export coverage", () => {
  it("field csv names and netcdf provenance", () => {
    const r = runDemoSync(baseInput());
    const c = fieldCsv(r, 3, "arabian", "2024-01-15");
    expect(c.name).toContain("arabian");
    expect(c.text.split("\n")[0]).toContain("temp_recon_c");
    const n = fieldNetcdf(r, "bob", "2024-07-15", 3);
    expect(n.name.endsWith(".nc")).toBe(true);
    const p = profileCsv(r, 1, 1, "bob", "2024-07-15");
    expect(p.text.split("\n").length).toBe(16);
  });
});
describe("cache and offline", () => {
  it("runKey is stable and distinct", () => {
    const a = runKey(baseInput());
    const b = runKey({ ...baseInput(), date: "2024-01-15" });
    expect(a).toBe(runKey(baseInput()));
    expect(a).not.toBe(b);
  });
  it("syncUrl writes query params", () => {
    syncUrl("bob", "2024-07-15", 3, "demo", "swin-monotonic-oi");
    expect(window.location.search).toContain("region=bob");
    expect(window.location.search).toContain("engine=demo");
  });
});
describe("api helpers", () => {
  it("backendBase and apiUrl resolve", () => {
    setBackendUrl("");
    expect(backendBase()).toBe("");
    expect(apiUrl("/api/health")).toBe("/api/health");
    expect(apiUrl("health")).toContain("health");
    setBackendUrl("http://localhost:8000/");
    expect(backendBase()).toBe("http://localhost:8000");
    expect(apiUrl("/api/health")).toBe("http://localhost:8000/api/health");
    setBackendUrl("");
  });
  it("toApiError parses codes", () => {
    const e1 = toApiError(503, { code: "credentials_not_configured", message: "need creds", missing: ["A"] }, "fb");
    expect(e1.code).toBe("credentials_not_configured");
    expect(e1.missing).toEqual(["A"]);
    const e2 = toApiError(422, { detail: { code: "invalid_region", message: "bad", missing: [] } }, "fb");
    expect(e2.code).toBe("invalid_region");
    const e3 = toApiError(500, null, "fallback-msg");
    expect(e3.message).toBe("fallback-msg");
  });
  it("engineFor routes and demo runs", async () => {
    expect(engineFor("demo")).toBe("demo");
    expect(engineFor("remote")).toBe("remote");
    const r = await demoEngine.run(baseInput());
    expect(r.depths.length).toBe(15);
  });
});
describe("panels and explorer", () => {
  beforeEach(async () => {
    await useSession.getState().run();
  });
  it("reconstruction controls render all selects", () => {
    render(<MemoryRouter><ReconstructionControls /></MemoryRouter>);
    expect(screen.getByTestId("recon-controls")).toBeInTheDocument();
    expect(screen.getByTestId("datamode-note").textContent).toContain("Data mode");
    fireEvent.change(screen.getByLabelText("Region", { exact: false }), { target: { value: "arabian" } });
    expect(useSession.getState().region).toBe("arabian");
    useSession.getState().setRegion("bob");
  });
  it("model explorer switches blocks", () => {
    render(<ModelExplorer />);
    expect(screen.getByTestId("model-explorer")).toBeInTheDocument();
    const btns = screen.getAllByRole("button");
    expect(btns.length).toBeGreaterThan(5);
    fireEvent.click(btns[0]);
    expect(screen.getByTestId("model-explorer").textContent).toBeTruthy();
  });
  it("harmonize panel shows stages and gap select", () => {
    render(<HarmonizePanel />);
    expect(screen.getByTestId("harmonize-panel").textContent).toContain("Harmonize");
    fireEvent.change(screen.getByLabelText("Gap-fill method"), { target: { value: "bilinear" } });
    expect(useSession.getState().gapMethod).toBe("bilinear");
    useSession.getState().setGapMethod("oi");
  });
  it("ingest pipeline backend charts render", () => {
    render(<IngestPanel />);
    expect(document.body.innerHTML.length).toBeGreaterThan(0);
    render(<PipelineDiagram />);
    expect(document.body.innerHTML).toContain("Ingest");
    render(<BackendIndicator />);
    expect(screen.getByTestId("backend-indicator")).toBeInTheDocument();
  });
  it("ts and validation and 3d render", () => {
    render(<TSChart />);
    expect(screen.getByTestId("ts-chart")).toBeInTheDocument();
    render(<ValidationChart />);
    expect(screen.getByTestId("validation-chart")).toBeInTheDocument();
    render(<Ocean3DView />);
    expect(document.body.innerHTML.length).toBeGreaterThan(0);
  });
});
describe("routes render", () => {
  beforeEach(async () => {
    await useSession.getState().run();
  });
  it("model data validation impact pages", () => {
    render(<MemoryRouter><ModelPage /></MemoryRouter>);
    expect(screen.getByTestId("model-page")).toBeInTheDocument();
    render(<MemoryRouter><DataPage /></MemoryRouter>);
    expect(screen.getByTestId("data-page")).toBeInTheDocument();
    render(<MemoryRouter><ValidationPage /></MemoryRouter>);
    expect(screen.getByTestId("validation-page")).toBeInTheDocument();
    render(<MemoryRouter><ImpactPage /></MemoryRouter>);
    expect(screen.getByTestId("impact-page")).toBeInTheDocument();
  });
});
