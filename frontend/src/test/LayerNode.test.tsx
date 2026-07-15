import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import type { ComponentType } from "react";
import { LayerNode } from "@/components/LayerNode";
import { useWeaveStore } from "@/store/useWeaveStore";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type }: { id: string; type: string }) => (
    <div data-testid="react-flow-handle" data-id={id} data-type={type} />
  ),
  Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
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
    expect(screen.getByText("1×16×32×32")).toBeInTheDocument();
  });

  it("hides the output shape badge when connected (has outgoing edges)", () => {
    act(() => {
      // Inject edges into the store to simulate a connected node
      useWeaveStore.setState({
        edges: [
          { id: "e1", source: "test-connected", target: "other-node" }
        ]
      });
    });

    render(<LayerNodeAny id="test-connected" data={baseData} />);
    expect(screen.queryByText("1×16×32×32")).not.toBeInTheDocument();

    act(() => {
      // Reset store state
      useWeaveStore.setState({ edges: [] });
    });
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

  it("renders multiple input handles for multi-input layers like MatMul", () => {
    render(<LayerNodeAny id="matmul-1" data={{ type: "MatMul", label: "MatMul 1", params: {} }} />);
    const handles = screen.getAllByTestId("react-flow-handle").filter(h => h.getAttribute("data-type") === "target");
    expect(handles.length).toBeGreaterThanOrEqual(2);
    expect(handles.some(h => h.getAttribute("data-id") === "input_0")).toBe(true);
    expect(handles.some(h => h.getAttribute("data-id") === "input_1")).toBe(true);
  });
});
