import pytest
from compiler.exporter import generate_pytorch_code
from schemas import GraphConfig, LinearNode, LinearParams, ResidualBlockNode

def test_generate_code_with_init_and_blocks():
    subgraph = GraphConfig(
        nodes=[
            {"id": "conv", "type": "Conv2d", "params": {"in_channels": 3, "out_channels": 3, "kernel_size": 3, "padding": 1}}
        ],
        edges=[
            {"source": "input", "target": "conv"},
            {"source": "conv", "target": "output"}
        ]
    )
    
    block_node = ResidualBlockNode(
        id="res_block",
        type="ResidualBlock",
        graph=subgraph
    )
    
    linear_node = LinearNode(
        id="fc",
        type="Linear",
        params=LinearParams(in_features=10, out_features=5, init_scheme="xavier_normal")
    )
    
    main_graph = GraphConfig(
        nodes=[block_node, linear_node],
        edges=[
            {"source": "input", "target": "res_block"},
            {"source": "res_block", "target": "fc"},
            {"source": "fc", "target": "output"}
        ]
    )
    
    code = generate_pytorch_code(main_graph)
    assert "init_scheme" not in code
    assert "nn.init.xavier_normal_" in code
    assert "class ResidualBlock_res_block" in code
