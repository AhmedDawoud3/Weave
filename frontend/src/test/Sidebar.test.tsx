import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/Sidebar";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  LayoutDashboard: () => <svg data-testid="layout-dashboard" />,
  Box: () => <svg data-testid="box" />,
}));

describe("Sidebar", () => {
  it("renders the brand name", () => {
    render(<Sidebar onNavigateDashboard={vi.fn()} />);
    expect(screen.getByText("WEAVE")).toBeInTheDocument();
  });

  it("renders all layer types as draggable options", () => {
    render(<Sidebar onNavigateDashboard={vi.fn()} />);
    expect(screen.getByText("CONV2D")).toBeInTheDocument();
    expect(screen.getByText("LINEAR")).toBeInTheDocument();
    expect(screen.getByText("DROPOUT")).toBeInTheDocument();
  });

  it("renders the Components label", () => {
    render(<Sidebar onNavigateDashboard={vi.fn()} />);
    expect(screen.getByText("Components")).toBeInTheDocument();
  });

  it("renders the dashboard navigation button", () => {
    render(<Sidebar onNavigateDashboard={vi.fn()} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
