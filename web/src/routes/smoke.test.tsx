import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Dashboard } from "@/routes/Dashboard";
import { useSession } from "@/store/session";
describe("routes smoke", () => {
  it("dashboard renders and runs", async () => {
    await useSession.getState().run();
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    expect(screen.getByTestId("dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("map-view")).toBeInTheDocument();
  });
});
