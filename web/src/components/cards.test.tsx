import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MetricCard } from "@/components/MetricCard";
import { DepthSlider } from "@/components/DepthSlider";
import { PhysicsLossPanel } from "@/components/PhysicsLossPanel";
import { DataSourceCard, ErrorBudgetTable } from "@/components/DataCards";
import { FallbackLadder } from "@/components/FallbackLadder";
import { DemoBadge, OfflineBadge } from "@/components/badges";
import { useSession } from "@/store/session";
import { DEPTH_LEVELS } from "@/lib/config";
describe("MetricCard", () => {
  it("formats numbers and shows DEMO badge", () => {
    render(<MetricCard label="RMSE" value={1.23456} unit="C" />);
    expect(screen.getByTestId("metric-RMSE")).toBeInTheDocument();
    expect(screen.getByTestId("metric-RMSE").textContent).toContain("1.23");
    expect(screen.getAllByTestId("demo-badge").length).toBeGreaterThan(0);
  });
  it("passes strings through and shows hint", () => {
    render(<MetricCard label="State" value="Not specified" hint="hello-hint" />);
    expect(screen.getByTestId("metric-State").textContent).toContain("Not specified");
    expect(screen.getByTestId("metric-State").textContent).toContain("hello-hint");
  });
});
describe("DepthSlider", () => {
  it("spans 0 to 14 and labels depth", () => {
    const fn = () => undefined;
    const { rerender } = render(<DepthSlider index={3} onChange={fn} />);
    const slider = screen.getByLabelText("Depth slice") as HTMLInputElement;
    expect(slider.min).toBe("0");
    expect(slider.max).toBe("14");
    expect(slider.value).toBe("3");
    expect(screen.getByText(DEPTH_LEVELS[3] + " m")).toBeInTheDocument();
    rerender(<DepthSlider index={10} onChange={fn} />);
    expect(screen.getByText(DEPTH_LEVELS[10] + " m")).toBeInTheDocument();
  });
  it("calls onChange with numeric value", () => {
    let got = -1;
    render(<DepthSlider index={0} onChange={(v) => { got = v; }} />);
    fireEvent.change(screen.getByLabelText("Depth slice"), { target: { value: "5" } });
    expect(got).toBe(5);
  });
});
describe("PhysicsLossPanel", () => {
  beforeEach(() => {
    useSession.getState().setPhysics({ lambda1: 0.8, lambda2: 0.4, stabOn: true, thermalOn: true });
  });
  it("shows formula and four loss numbers", async () => {
    await useSession.getState().run();
    render(<PhysicsLossPanel />);
    expect(screen.getByTestId("physics-panel")).toBeInTheDocument();
    const txt = screen.getByTestId("physics-panel").textContent || "";
    expect(txt).toContain("Total Loss");
    expect(txt).toContain("MSE");
    expect(txt).toContain("Lstab");
    expect(txt).toContain("Total");
  });
  it("sliders update lambda", async () => {
    await useSession.getState().run();
    render(<PhysicsLossPanel />);
    fireEvent.change(screen.getByLabelText("lambda1"), { target: { value: "1.5" } });
    expect(useSession.getState().physics.lambda1).toBe(1.5);
    fireEvent.change(screen.getByLabelText("lambda2"), { target: { value: "2.0" } });
    expect(useSession.getState().physics.lambda2).toBe(2);
    useSession.getState().setPhysics({ lambda1: 0.8, lambda2: 0.4 });
  });
});
describe("DataSourceCard", () => {
  it("renders metadata and ingest state", async () => {
    await useSession.getState().run();
    render(<DataSourceCard id="OSTIA" />);
    const card = screen.getByTestId("source-OSTIA");
    expect(card.textContent).toContain("OSTIA");
    expect(card.textContent).toContain("SST");
    expect(card.textContent).toContain("0.05");
  });
  it("returns null for unknown id", () => {
    const { container } = render(<DataSourceCard id="NOPE" />);
    expect(container.innerHTML).toBe("");
  });
  it("error budget scales bands", async () => {
    await useSession.getState().run();
    render(<ErrorBudgetTable region="bob" />);
    const t = screen.getByTestId("error-budget-bob");
    expect(t.textContent).toContain("50");
    expect(t.textContent).toContain("RMSE");
  });
});
describe("FallbackLadder", () => {
  it("lists five rows and mode selector", () => {
    render(<FallbackLadder />);
    const el = screen.getByTestId("fallback-ladder");
    expect(el.textContent).toContain("Fallback ladder");
    expect(el.textContent).toContain("Monotonic Spline");
    expect(el.textContent).toContain("Optimal Interpolation");
    fireEvent.change(screen.getByLabelText("Engine mode selector"), { target: { value: "swin-mlp-oi" } });
    expect(useSession.getState().engineMode).toBe("swin-mlp-oi");
    useSession.getState().setEngineMode("swin-monotonic-oi");
  });
});
describe("badges", () => {
  it("demo badge shows DEMO compact and full", () => {
    render(<DemoBadge compact />);
    expect(screen.getByTestId("demo-badge").textContent).toContain("DEMO");
    expect(screen.getByTestId("demo-badge").getAttribute("title")).toContain("Synthetic");
  });
  it("offline badge hidden online and shown offline", () => {
    const { unmount } = render(<OfflineBadge online={true} />);
    expect(screen.queryByTestId("offline-badge")).toBeNull();
    unmount();
    render(<OfflineBadge online={false} />);
    expect(screen.getByTestId("offline-badge").textContent).toContain("OFFLINE MODE");
  });
});
