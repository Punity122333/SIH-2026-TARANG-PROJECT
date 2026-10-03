import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileChart } from "@/components/ProfileChart";
import { useSession } from "@/store/session";
vi.mock("react-plotly.js", () => ({
  default: (props: { data: unknown[]; layout: unknown }) => {
    const d = props.data as { x: number[]; y: number[]; name?: string }[];
    const l = props.layout as { yaxis?: { autorange?: string; tickvals?: number[] }; shapes?: unknown[] };
    const traces = d.length;
    const n0 = d[0] ? (d[0].x as number[]).length : 0;
    const rev = l && l.yaxis ? String(l.yaxis.autorange) : "";
    const ticks = l && l.yaxis && l.yaxis.tickvals ? (l.yaxis.tickvals as number[]).length : 0;
    const shapes = l && l.shapes ? (l.shapes as unknown[]).length : 0;
    return (
      <div data-testid="plotly-mock" data-traces={traces} data-n0={n0} data-rev={rev} data-ticks={ticks} data-shapes={shapes}>
        mock-plot
      </div>
    );
  }
}));
describe("ProfileChart", () => {
  beforeEach(async () => {
    useSession.getState().setPhysics({ lambda1: 0.8, lambda2: 0.4, stabOn: true, thermalOn: true, monotonic: true });
    await useSession.getState().run();
  });
  it("uses inverted depth axis with 15 markers", () => {
    render(<ProfileChart />);
    expect(screen.getByTestId("profile-chart")).toBeInTheDocument();
    const mock = screen.getByTestId("plotly-mock");
    expect(mock.getAttribute("data-rev")).toBe("reversed");
    expect(mock.getAttribute("data-ticks")).toBe("15");
    expect(mock.getAttribute("data-n0")).toBe("15");
  });
  it("has three traces and thermocline shading", () => {
    render(<ProfileChart />);
    const mock = screen.getByTestId("plotly-mock");
    expect(mock.getAttribute("data-traces")).toBe("3");
    expect(mock.getAttribute("data-shapes")).toBe("1");
  });
  it("mentions 15 markers and demo provenance", () => {
    render(<ProfileChart />);
    const txt = screen.getByTestId("profile-chart").textContent || "";
    expect(txt).toContain("15 depth markers");
    expect(txt).toContain("depth inverted");
  });
});
