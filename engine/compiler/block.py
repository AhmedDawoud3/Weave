import torch
import torch.nn as nn

from schemas import NodeConfig

from .factory import ComponentFactory
from .modules import (
    AddModule,
    ConcatModule,
    DivModule,
    MatMulModule,
    MultiplyModule,
    SubModule,
)


class WeaveBlock(nn.Module):
    """
    The dynamically constructed PyTorch module.
    Executes the forward pass following a pre-calculated topological order.
    """

    def __init__(
        self,
        exec_order: list[str],
        node_map: dict[str, NodeConfig],
        incoming_edges: dict[str, list[str]],
    ):
        super().__init__()
        self.exec_order = exec_order
        self.incoming_edges = incoming_edges

        # Instantiate requested components using the Factory
        # Using nn.ModuleDict properly registers submodules so `.cuda()`, `.parameters()`, etc work
        self.operations = nn.ModuleDict()

        for node_id in self.exec_order:
            if node_id in ("input", "output"):
                continue

            node = node_map[node_id]
            layer = ComponentFactory.create_layer(node)
            self.operations[node_id] = layer

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # State dictionary holds tensor values emitted by each node
        tensors: dict[str, torch.Tensor] = {"input": x}

        for node_id in self.exec_order:
            # Reached output, compile its incoming sources and exit
            if node_id == "output":
                sources = self.incoming_edges.get("output", [])
                if len(sources) != 1:
                    raise RuntimeError(
                        "Output node must have exactly 1 incoming edge, "
                        f"but received {len(sources)}. Invalid DAG state."
                    )

                output_source = sources[0]
                if output_source not in tensors:
                    raise RuntimeError(
                        f"Output source '{output_source}' was not computed "
                        "before reaching the output node. Invalid DAG state."
                    )

                return tensors[output_source]
            if node_id == "input":
                continue

            # Gather all inputs required for the current node
            sources = self.incoming_edges.get(node_id, [])
            input_tensors = [tensors[src] for src in sources]

            # Execute layer
            layer = self.operations[node_id]

            # Single-input vs Multi-input resolution boundary
            if isinstance(layer, (AddModule, ConcatModule, MultiplyModule, SubModule, DivModule, MatMulModule)):
                out = layer(input_tensors)
            else:
                if len(input_tensors) != 1:
                    raise RuntimeError(
                        f"Node {node_id} ({type(layer).__name__}) expected 1 input but received {len(input_tensors)}. Invalid DAG state."
                    )
                inp = input_tensors[0]
                # Auto-flatten: Linear layers expect 2D (batch, features).
                # If the input has more dimensions (e.g. images: batch, C, H, W),
                # flatten to (batch, -1) automatically so users don't need an
                # explicit Flatten node in simple graphs.
                if isinstance(layer, nn.Linear) and inp.dim() > 2:
                    if inp.shape[-1] != layer.in_features:
                        inp = inp.flatten(1)
                out = layer(inp)

            tensors[node_id] = out

        raise RuntimeError("Reached end of forward pass without hitting 'output' node.")
