import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LayerPalette } from "../components/LayerPalette";

// Mock store
vi.mock("../store/useWeaveStore", () => ({
  useWeaveStore: vi.fn((selector) => {
    const state = {
      addNode: vi.fn(),
      datasetConfig: null,
      inferredDatasetShape: null,
      setActiveTab: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock lucide-react icons dynamically using a Proxy
vi.mock("lucide-react", () => {
  const mockIcons: Record<string, any> = {
    LayoutDashboard: () => <svg data-testid="layout-dashboard" />,
    Search: () => <svg data-testid="search" />,
  };
  return new Proxy(mockIcons, {
    get: (target, prop) => {
      if (typeof prop === "string") {
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

describe("LayerPalette", () => {
  it("renders the brand name", () => {
    render(<LayerPalette onNavigateDashboard={vi.fn()} />);
    expect(screen.getByText("Weave")).toBeInTheDocument();
  });

  it("renders the dashboard navigation button and calls callback on click", async () => {
    const onNavigateDashboard = vi.fn();
    render(<LayerPalette onNavigateDashboard={onNavigateDashboard} />);
    
    const svg = screen.getByTestId("layout-dashboard");
    const button = svg.closest("button");
    expect(button).toBeInTheDocument();
    
    button!.click();
    expect(onNavigateDashboard).toHaveBeenCalledTimes(1);
  });

  it("renders the dataset placeholder when no dataset is configured", () => {
    render(<LayerPalette onNavigateDashboard={vi.fn()} />);
    expect(screen.getByText(/No dataset is configured/i)).toBeInTheDocument();
  });
});
