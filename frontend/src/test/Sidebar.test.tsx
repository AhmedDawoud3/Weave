import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/Sidebar";

// Mock lucide-react icons dynamically using a Proxy, only intercepting uppercase icon names
vi.mock("lucide-react", () => {
  const mockIcons: Record<string, any> = {
    LayoutDashboard: () => <svg data-testid="layout-dashboard" />,
    Box: () => <svg data-testid="box" />,
  };
  return new Proxy(mockIcons, {
    get: (target, prop) => {
      if (typeof prop === "string") {
        // Only mock actual icon names (which start with an uppercase letter)
        if (prop[0] === prop[0].toUpperCase() && prop[0] !== "_") {
          if (!target[prop]) {
            target[prop] = (props: any) => <svg data-testid={`mock-${prop}`} {...props} />;
          }
          return target[prop];
        }
      }
      return Reflect.get(target, prop);
    },
  });
});

// Mock DatasetPanel to prevent loading deep store dependencies and async fetch side-effects
vi.mock("../components/DatasetPanel", () => ({
  DatasetPanel: () => <div data-testid="mock-dataset-panel" />,
}));
vi.mock("@/components/DatasetPanel", () => ({
  DatasetPanel: () => <div data-testid="mock-dataset-panel" />,
}));

describe("Sidebar", () => {
  it("renders the brand name", () => {
    render(<Sidebar onNavigateDashboard={vi.fn()} />);
    expect(screen.getByText("WEAVE")).toBeInTheDocument();
  });

  it("renders the dashboard navigation button and calls callback on click", async () => {
    const onNavigateDashboard = vi.fn();
    render(<Sidebar onNavigateDashboard={onNavigateDashboard} />);
    
    const svg = screen.getByTestId("layout-dashboard");
    const button = svg.closest("button");
    expect(button).toBeInTheDocument();
    
    button!.click();
    expect(onNavigateDashboard).toHaveBeenCalledTimes(1);
  });

  it("renders the dataset placeholder when no dataset is configured", () => {
    render(<Sidebar onNavigateDashboard={vi.fn()} />);
    expect(screen.getByText(/No dataset is currently configured/i)).toBeInTheDocument();
  });
});
