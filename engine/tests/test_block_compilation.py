import pytest
from compiler.compiler import GraphCompiler
from schemas import GraphConfig, ResidualBlockNode

def test_compile_residual_block():
    subgraph = GraphConfig(
        nodes=[
            {"id": "conv", "type": "Conv2d", "params": {"in_channels": 3, "out_channels": 3, "kernel_size": 3, "padding": 1}},
            {"id": "relu", "type": "ReLU"}
        ],
        edges=[
            {"source": "input", "target": "conv"},
            {"source": "conv", "target": "relu"},
            {"source": "relu", "target": "output"}
        ]
    )
    
    block_node = ResidualBlockNode(
        id="res_block",
        type="ResidualBlock",
        graph=subgraph
    )
    
    main_graph = GraphConfig(
        nodes=[block_node],
        edges=[
            {"source": "input", "target": "res_block"},
            {"source": "res_block", "target": "output"}
        ]
    )
    
    compiler = GraphCompiler()
    compiled_block = compiler.compile(main_graph)
    assert compiled_block is not None
    assert "res_block" in compiled_block.operations
