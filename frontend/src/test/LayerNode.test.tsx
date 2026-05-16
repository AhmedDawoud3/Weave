import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { LayerNode } from "@/components/LayerNode";

// Mock reactflow Handle and Position since they are DOM-drawing primitives
vi.mock("reactflow", () => ({
  Handle: () => null,
  Position: { Top: "top", Bottom: "bottom" },
}));

// Cast to bypass reactflow's NodeProps type requirements in unit tests
const LayerNodeAny = LayerNode as ComponentType<{ id: string; data: unknown }>;

describe("LayerNode", () => {
  const baseData = {
    type: "CONV2D" as const,
    params: { units: 64, activation: "relu" },
  };

  it("renders the layer type", () => {
    render(<LayerNodeAny id="test-1" data={baseData} />);
    expect(screen.getByText("CONV2D")).toBeInTheDocument();
  });

  it("displays units and activation from params", () => {
    render(<LayerNodeAny id="test-2" data={baseData} />);
    expect(screen.getByText("64")).toBeInTheDocument();
    expect(screen.getByText("relu")).toBeInTheDocument();
  });

  it("falls back to 0 for undefined units", () => {
    render(
      <LayerNodeAny
        id="test-3"
        data={{ type: "DROPOUT" as const, params: { activation: "relu" } }}
      />
    );
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
