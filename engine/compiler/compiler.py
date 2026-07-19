import logging
import math
from collections import defaultdict, deque

import torch
import torch.nn as nn

from schemas import GraphConfig, NodeConfig

from .block import WeaveBlock
from .factory import ComponentFactory
from .modules import (
    AddModule,
    ConcatModule,
    DivModule,
    MatMulModule,
    MultiplyModule,
    SubModule,
)

logger = logging.getLogger(__name__)


class GraphCompiler:
    """Takes validated GraphConfig and compiles into a runnable PyTorch Module."""

    def compile(self, graph_json: dict | GraphConfig) -> WeaveBlock:
        # Validate Pydantic schema if bare dictionary is provided
        if isinstance(graph_json, dict):
            graph = GraphConfig(**graph_json)
        else:
            graph = graph_json

        logger.info(
            f"Compiling graph with {len(graph.nodes)} nodes and {len(graph.edges)} edges."
        )

        # Topo sort data structure
        adj_list = defaultdict(list)
        in_degree = defaultdict(int)
        incoming_edges = defaultdict(list)

        # Fast lookup mapping
        node_map = {}
        for node in graph.nodes:
            if node.id in node_map:
                raise ValueError(f"Duplicate node id detected: '{node.id}'.")
            node_map[node.id] = node

        # Topological Sort Configuration & Bounds Checking
        MAX_NODES = 500  # Governance limit to prevent DoS attacks via unbounded node compilation
        if len(graph.nodes) > MAX_NODES:
            raise ValueError(
                f"Graph exceeds maximum compilation length of {MAX_NODES} nodes."
            )

        # Collect input ports and output ports from the graph nodes
        input_ports = [n.id for n in graph.nodes if n.type in ("InputPort", "InputNode")]
        output_ports = [n.id for n in graph.nodes if n.type in ("OutputPort", "OutputNode")]

        # Fallback for old single-input/single-output graphs
        if not input_ports:
            input_ports = ["input"]
        if not output_ports:
            output_ports = ["output"]

        nodes_in_graph = set()
        for node in graph.nodes:
            nodes_in_graph.add(node.id)
        # Add virtual nodes or edge boundary nodes
        for edge in graph.edges:
            nodes_in_graph.add(edge.source)
            nodes_in_graph.add(edge.target)

        # Initialize all nodes (ensures disconnected components are tracked)
        for nid in nodes_in_graph:
            in_degree[nid] = 0

        # Build adj list
        for edge in graph.edges:
            adj_list[edge.source].append(edge.target)
            incoming_edges[edge.target].append(edge.source)
            in_degree[edge.target] += 1

        # Topo Sort (Kahn's Algorithm)
        exec_order = []
        queue = deque([n for n in nodes_in_graph if in_degree[n] == 0])

        while queue:
            current = queue.popleft()
            exec_order.append(current)
            for neighbor in adj_list[current]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        # Cycle detection
        if len(exec_order) != len(nodes_in_graph):
            # To ensure the audit log detects a potential malicious DAG
            raise ValueError(
                f"Cycle detected! Completed mapping {len(exec_order)} of {len(nodes_in_graph)} nodes. Non-DAG loops are not permitted."
            )

        # Enforce that output is reachable from input
        for out_p in output_ports:
            if not incoming_edges.get(out_p) and out_p in nodes_in_graph:
                raise ValueError(f"No path leads to output port '{out_p}'.")

        reachable_from_input = set()
        reachability_queue = deque(input_ports)

        while reachability_queue:
            current = reachability_queue.popleft()
            if current in reachable_from_input:
                continue
            reachable_from_input.add(current)
            for neighbor in adj_list[current]:
                if neighbor not in reachable_from_input:
                    reachability_queue.append(neighbor)

        for out_p in output_ports:
            if out_p not in reachable_from_input and out_p in nodes_in_graph:
                raise ValueError(f"No path leads from input ports to output port '{out_p}'.")
        return WeaveBlock(exec_order, node_map, incoming_edges, input_ports, output_ports)

    def validate_pipeline(self, graph: GraphConfig, input_shape: list[int]) -> dict:
        logger.info(f"Validating pipeline with input shape: {input_shape}")
        try:
            # 1. Compile the graph to get execution order and operations
            block = self.compile(graph)
        except ValueError as e:
            logger.warning(
                f"Pipeline validation failed due to user graph configuration issue: {e}"
            )
            return {"status": "error", "message": f"Graph connection issue: {str(e)}"}
        except Exception as e:
            logger.error(
                f"Pipeline validation failed with unexpected error: {e}", exc_info=True
            )
            return {
                "status": "error",
                "message": f"Whoops, we couldn't compile the graph: {str(e)}",
            }

        # 2. Create the dummy input tensor
        try:
            # Governance Control: Prevent OOM (Out Of Memory) DoS attacks
            total_elements = math.prod(input_shape) if input_shape else 0
            MAX_TENSOR_ELEMENTS = 100_000_000  # Roughly 400MB for float32

            if total_elements > MAX_TENSOR_ELEMENTS:
                # RAI: Plain language bounds warning
                logger.warning(
                    f"AUDIT TRAIL: Blocked tensor creation of shape {input_shape} ({total_elements} elements). Exceeds {MAX_TENSOR_ELEMENTS} limit."
                )
                return {
                    "status": "error",
                    "message": f"Whoa, that matrix is way too big! The input shape {input_shape} is mathematically huge. Try shrinking your image dimensions or channel sizes.",
                }

            x = torch.zeros(input_shape)
        except Exception as e:
            return {
                "status": "error",
                "message": f"Hmm, failed to create a shape of {input_shape}. Technical detail: {str(e)}",
            }

        # 3. Simulate the forward pass, recording shapes
        logger.info("Starting shape propagation simulation for compiled graph...")
        block.eval()
        tensors = {}
        for ip in block.input_ports:
            tensors[ip] = x
        node_shapes = {ip: list(tensors[ip].shape) for ip in block.input_ports}

        with torch.inference_mode():
            for node_id in block.exec_order:
                if node_id in block.input_ports:
                    continue

                if node_id in block.output_ports:
                    sources = block.incoming_edges.get(node_id, [])
                    if len(sources) != 1:
                        return {
                            "status": "error",
                            "message": f"Uh oh! The OutputPort node '{node_id}' must have exactly 1 incoming arrow, but it received {len(sources)}.",
                        }

                    output_source = sources[0]
                    if output_source not in tensors:
                        return {
                            "status": "error",
                            "message": f"Couldn't track the values coming into '{output_source}'. Is it disconnected?",
                        }

                    tensors[node_id] = tensors[output_source]
                    node_shapes[node_id] = list(tensors[node_id].shape)
                    continue

                # Gather inputs
                sources = block.incoming_edges.get(node_id, [])
                input_tensors = [tensors[src] for src in sources]

                # Execute layer safely
                layer = block.operations[node_id]
                try:
                    if isinstance(
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
                    else:
                        if len(input_tensors) != 1:
                            return {
                                "status": "error",
                                "message": f"Node '{node_id}' expected 1 arrow pointing towards it, but received {len(input_tensors)}.",
                            }
                        inp = input_tensors[0]
                        # Auto-flatten for Linear layers (mirrors WeaveBlock.forward)
                        if isinstance(layer, nn.Linear) and inp.dim() > 2:
                            if inp.shape[-1] != layer.in_features:
                                inp = inp.flatten(1)
                        elif isinstance(layer, nn.Embedding) and inp.dtype not in (torch.long, torch.int, torch.int32, torch.int64):
                            inp = inp.long()
                        out = layer(inp)
                except RuntimeError as e:
                    # RAI: Translate PyTorch's cryptic error messages into accessible language
                    return {
                        "status": "error",
                        "message": f"Shape mismatch at '{node_id}'. The shapes of the matrices don't match for this operation. Technical detail: {str(e)}",
                    }
                except Exception as e:
                    # RAI: Ensure error is readable
                    return {
                        "status": "error",
                        "message": f"Error evaluating '{node_id}'. Please check if your connections are correct. Technical detail: {str(e)}",
                    }

                tensors[node_id] = out
                node_shapes[node_id] = list(out.shape)
                logger.debug(
                    f"Node '{node_id}' shape propagation: output_shape={node_shapes[node_id]}"
                )
        # Set final output shapes for backward compatibility
        if len(block.output_ports) == 1:
            node_shapes["output"] = node_shapes.get(block.output_ports[0])
        else:
            node_shapes["output"] = [node_shapes.get(p) for p in block.output_ports]

        logger.info(
            f"Pipeline validation completed successfully. Output shape: {node_shapes.get('output')}"
        )
        return {"status": "success", "node_shapes": node_shapes}

    # Layer types that accept multiple inputs
    MULTI_INPUT_TYPES = {"Add", "Concat", "Multiply", "Sub", "Div", "MatMul"}

    # Layer types that contain a nested subgraph
    BLOCK_TYPES = {
        "ResidualBlock",
        "TransformerEncoder",
        "MultiHeadAttention",
        "ConvBNReLU",
        "BottleneckBlock",
        "Block",
        "Module",
        "Stack",
    }

    def infer_layer_shape(
        self,
        node: NodeConfig,
        input_shape: list[int] | None = None,
        input_shapes: list[list[int]] | None = None,
    ) -> dict:
        """
        Compute the output shape of a single layer or block without
        requiring a fully connected graph.

        Returns {"status": "success", "output_shape": [...]}
        or     {"status": "error",   "message": "..."}
        """
        node_type: str = node.type

        # --- Block nodes: delegate to validate_pipeline on the subgraph ---
        if node_type in self.BLOCK_TYPES:
            node_graph = getattr(node, "graph", None)
            if node_graph is None:
                return {
                    "status": "error",
                    "message": f"Block node '{node_type}' is missing its nested graph definition.",
                }
            if input_shape is None:
                return {
                    "status": "error",
                    "message": f"Block node '{node_type}' requires input_shape to infer output.",
                }
            sub_result = self.validate_pipeline(node_graph, input_shape)
            if sub_result["status"] == "error":
                return sub_result
            # Extract the output node shape from the full pipeline result
            output_shape = sub_result["node_shapes"].get("output")
            if output_shape is None:
                return {
                    "status": "error",
                    "message": f"Subgraph for '{node_type}' did not produce an output shape.",
                }
            return {"status": "success", "output_shape": output_shape}

        # --- Multi-input layers (Add, Concat, Multiply) ---
        if node_type in self.MULTI_INPUT_TYPES:
            if not input_shapes:
                return {
                    "status": "error",
                    "message": f"Layer type '{node_type}' requires input_shapes (list of shapes), not a single input_shape.",
                }
            return self._infer_multi_input_layer(node, input_shapes)

        # --- Single-input layers ---
        if input_shape is None:
            return {
                "status": "error",
                "message": f"Layer type '{node_type}' requires input_shape.",
            }
        return self._infer_single_input_layer(node, input_shape)

    def _infer_single_input_layer(
        self, node: NodeConfig, input_shape: list[int]
    ) -> dict:
        """Run a dummy tensor through a single-input layer."""
        # Governance: same OOM guard as validate_pipeline
        total_elements = math.prod(input_shape) if input_shape else 0
        MAX_TENSOR_ELEMENTS = 100_000_000
        if total_elements > MAX_TENSOR_ELEMENTS:
            return {
                "status": "error",
                "message": f"Input shape {input_shape} is too large ({total_elements} elements). Try smaller dimensions.",
            }

        try:
            x = torch.zeros(input_shape)
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to create tensor of shape {input_shape}: {str(e)}",
            }

        try:
            layer = ComponentFactory.create_layer(node)
        except NotImplementedError as e:
            return {"status": "error", "message": str(e)}

        layer.eval()
        with torch.inference_mode():
            try:
                if isinstance(layer, nn.Linear) and x.dim() > 2:
                    if x.shape[-1] != layer.in_features:
                        x = x.flatten(1)
                out = layer(x)
            except RuntimeError as e:
                return {
                    "status": "error",
                    "message": f"Shape mismatch at '{node.type}'. The input shape {input_shape} doesn't work for this operation. Technical detail: {str(e)}",
                }
            except Exception as e:
                return {
                    "status": "error",
                    "message": f"Error evaluating '{node.type}': {str(e)}",
                }

        return {"status": "success", "output_shape": list(out.shape)}

    def _infer_multi_input_layer(
        self, node: NodeConfig, input_shapes: list[list[int]]
    ) -> dict:
        """Run dummy tensors through a multi-input layer (Add, Concat, Multiply)."""
        # Governance: check each input
        MAX_TENSOR_ELEMENTS = 100_000_000
        for i, shape in enumerate(input_shapes):
            total_elements = math.prod(shape) if shape else 0
            if total_elements > MAX_TENSOR_ELEMENTS:
                return {
                    "status": "error",
                    "message": f"Input shape {shape} at index {i} is too large ({total_elements} elements). Try smaller dimensions.",
                }

        try:
            tensors = [torch.zeros(s) for s in input_shapes]
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to create input tensors: {str(e)}",
            }

        try:
            layer = ComponentFactory.create_layer(node)
        except NotImplementedError as e:
            return {"status": "error", "message": str(e)}

        layer.eval()
        with torch.inference_mode():
            try:
                if isinstance(
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
                    out = layer(tensors)
                else:
                    return {
                        "status": "error",
                        "message": f"Layer type '{node.type}' was expected to be multi-input but isn't.",
                    }
            except RuntimeError as e:
                return {
                    "status": "error",
                    "message": f"Shape mismatch at '{node.type}'. The input shapes {input_shapes} don't work for this operation. Technical detail: {str(e)}",
                }
            except Exception as e:
                return {
                    "status": "error",
                    "message": f"Error evaluating '{node.type}': {str(e)}",
                }

        return {"status": "success", "output_shape": list(out.shape)}
