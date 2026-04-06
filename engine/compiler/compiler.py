from collections import defaultdict, deque
from typing import Union

from schemas import GraphConfig

from .block import WeaveBlock


class GraphCompiler:
    """Takes validated GraphConfig and compiles into a runnable PyTorch Module."""

    def compile(self, graph_json: Union[dict, GraphConfig]) -> WeaveBlock:
        # Validate Pydantic schema if bare dictionary is provided
        if isinstance(graph_json, dict):
            graph = GraphConfig(**graph_json)
        else:
            graph = graph_json

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

        nodes_in_graph = set(["input", "output"])
        for node in graph.nodes:
            nodes_in_graph.add(node.id)

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

        # Enforce that output is in executable graph
        if "output" not in exec_order:
            raise ValueError("No path leads to 'output' node.")

        return WeaveBlock(exec_order, node_map, incoming_edges)
