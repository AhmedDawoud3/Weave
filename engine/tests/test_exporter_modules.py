import pytest
from compiler.exporter import generate_pytorch_code
from schemas import GraphConfig

def test_exporter_modules():
    subgraph = {
        "nodes": [
            {"id": "ip", "type": "InputPort", "params": {"name": "x"}},
            {"id": "linear", "type": "Linear", "params": {"in_features": 10, "out_features": 5}},
            {"id": "op", "type": "OutputPort", "params": {"name": "out"}}
        ],
        "edges": [
            {"source": "ip", "target": "linear"},
            {"source": "linear", "target": "op"}
        ]
    }
    
    main_graph = {
        "nodes": [
            {"id": "m1", "type": "Module", "name": "LinearBlock", "graph": subgraph}
        ],
        "edges": [
            {"source": "input", "target": "m1"},
            {"source": "m1", "target": "output"}
        ]
    }
    
    code = generate_pytorch_code(GraphConfig.model_validate(main_graph))
    assert "class LinearBlock_m1(nn.Module):" in code
    assert "self.linear = nn.Linear(in_features=10, out_features=5" in code
