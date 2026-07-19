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
        input_ports: list[str] = None,
        output_ports: list[str] = None,
    ):
        super().__init__()
        self.exec_order = exec_order
        self.incoming_edges = incoming_edges
        self.input_ports = input_ports or ["input"]
        self.output_ports = output_ports or ["output"]

        # Instantiate requested components using the Factory
        # Using nn.ModuleDict properly registers submodules so `.cuda()`, `.parameters()`, etc work
        self.operations = nn.ModuleDict()

        for node_id in self.exec_order:
            if node_id in self.input_ports or node_id in self.output_ports:
                continue
            if node_id in ("input", "output"):
                continue

            node = node_map[node_id]
            layer = ComponentFactory.create_layer(node)
            self.operations[node_id] = layer

    def forward(self, x, *args, **kwargs):
        # State dictionary holds tensor values emitted by each node
        tensors: dict[str, torch.Tensor] = {}

        # Seed input ports
        tensors[self.input_ports[0]] = x
        for i, val in enumerate(args):
            if i + 1 < len(self.input_ports):
                tensors[self.input_ports[i + 1]] = val
        for k, val in kwargs.items():
            if k in self.input_ports:
                tensors[k] = val

        # Handle single input parameter fallback / broadcasting
        if not args and len(self.input_ports) > 1:
            for ip in self.input_ports:
                if ip not in tensors:
                    tensors[ip] = x

        for node_id in self.exec_order:
            if node_id in self.input_ports:
                continue

            # Gather all inputs required for the current node
            sources = self.incoming_edges.get(node_id, [])
            input_tensors = [tensors[src] for src in sources]

            # Output ports just act as identity placeholders inside forward pass
            if node_id in self.output_ports:
                tensors[node_id] = input_tensors[0] if input_tensors else None
                continue

            # Execute layer
            layer = self.operations[node_id]

            # Single-input vs Multi-input resolution boundary
            if isinstance(layer, WeaveBlock):
                out = layer(*input_tensors)
            elif isinstance(
                layer,
                (
                    AddModule,
                    ConcatModule,
                    MultiplyModule,
                    SubModule,
                    DivModule,
                    MatMulModule,
                ),
            ):
                out = layer(input_tensors)
            elif type(layer).__name__ == "StackModule":
                out = layer(*input_tensors)
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
                elif isinstance(layer, nn.Embedding) and inp.dtype not in (torch.long, torch.int, torch.int32, torch.int64):
                    inp = inp.long()
                out = layer(inp)

            tensors[node_id] = out

        # Retrieve output values
        for p in self.output_ports:
            if p not in tensors:
                raise RuntimeError(
                    f"Reached end of forward pass without hitting '{p}' node."
                )
        outputs = [tensors.get(p) for p in self.output_ports]
        if len(outputs) == 1:
            return outputs[0]
        return tuple(outputs)
