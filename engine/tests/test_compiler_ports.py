import pytest
import torch
from compiler.compiler import GraphCompiler
from schemas import GraphConfig

def test_compiler_multi_ports():
    subgraph = {
        "nodes": [
            {"id": "ip_x", "type": "InputPort", "params": {"name": "x"}},
            {"id": "ip_skip", "type": "InputPort", "params": {"name": "skip"}},
            {"id": "add", "type": "Add"},
            {"id": "op", "type": "OutputPort", "params": {"name": "out"}}
        ],
        "edges": [
            {"source": "ip_x", "target": "add"},
            {"source": "ip_skip", "target": "add"},
            {"source": "add", "target": "op"}
        ]
    }
    
    main_graph = {
        "nodes": [
            {"id": "m1", "type": "Module", "name": "CustomAdd", "graph": subgraph}
        ],
        "edges": [
            {"source": "input", "target": "m1"},
            {"source": "m1", "target": "output"}
        ]
    }
    
    compiler = GraphCompiler()
    block = compiler.compile(GraphConfig.model_validate(main_graph))
    assert block is not None
    
    x = torch.ones(1, 10)
    out = block(x)
    assert out is not None
    assert out.shape == (1, 10)
    assert torch.allclose(out, x * 2)
