import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { LayerNode } from "@/components/LayerNode";

// Mock reactflow Handle and Position since they are DOM-drawing primitives
vi.mock("reactflow", () => ({
  Handle: () => null,
  Position: { Top: "top", Bottom: "bottom" },
  useUpdateNodeInternals: () => vi.fn(),
}));

// Cast to bypass reactflow's NodeProps type requirements in unit tests
const LayerNodeAny = LayerNode as ComponentType<{ id: string; data: unknown }>;

describe("LayerNode", () => {
  const baseData = {
    type: "Conv2d" as const,
    label: "CONV1",
    params: { in_channels: 3, out_channels: 16, kernel_size: 3 },
    outputShape: [1, 16, 32, 32],
  };

  it("renders the layer type and label", () => {
    render(<LayerNodeAny id="test-1" data={baseData} />);
    expect(screen.getByText("Conv2d")).toBeInTheDocument();
    expect(screen.getByText("CONV1")).toBeInTheDocument();
  });

  it("displays the output shape badge when provided", () => {
    render(<LayerNodeAny id="test-2" data={baseData} />);
    expect(screen.getByText("[1, 16, 32, 32]")).toBeInTheDocument();
  });

  it("does not render shape badge if not provided", () => {
    render(
      <LayerNodeAny
        id="test-3"
        data={{ type: "Dropout" as const, label: "DROP1", params: { p: 0.5 } }}
      />
    );
    expect(screen.queryByText(/\[.*\]/)).not.toBeInTheDocument();
  });
});
