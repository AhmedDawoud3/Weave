import torch
import torch.nn as nn
from compiler.compiler import GraphCompiler

def test_decoder_only_transformer_compilation_and_step():
    # Define complete Transformer LM graph matching preset template
    graph = {
        "nodes": [
            {"id": "input", "type": "InputNode", "label": "Inputs", "params": {}},
            {"id": "embed", "type": "Embedding", "label": "Embedding", "params": {"num_embeddings": 10000, "embedding_dim": 64}},
            {"id": "pe", "type": "PositionalEncoding", "label": "PositionalEncoding", "params": {"embed_dim": 64, "max_seq_len": 512, "pe_type": "sinusoidal"}},
            {"id": "attn", "type": "SelfAttention", "label": "SelfAttention", "params": {"embed_dim": 64, "num_heads": 4, "causal": True, "dropout": 0.1}},
            {"id": "ff", "type": "FeedForward", "label": "FeedForward", "params": {"embed_dim": 64, "expansion": 4, "dropout": 0.1}},
            {"id": "ln", "type": "LayerNorm", "label": "LayerNorm", "params": {"normalized_shape": [64]}},
            {"id": "linear", "type": "Linear", "label": "Linear", "params": {"in_features": 64, "out_features": 10000}},
            {"id": "softmax", "type": "Softmax", "label": "Softmax", "params": {"dim": -1}},
            {"id": "output", "type": "OutputNode", "label": "Predictions", "params": {}}
        ],
        "edges": [
            {"source": "input", "target": "embed"},
            {"source": "embed", "target": "pe"},
            {"source": "pe", "target": "attn"},
            {"source": "attn", "target": "ff"},
            {"source": "ff", "target": "ln"},
            {"source": "ln", "target": "linear"},
            {"source": "linear", "target": "softmax"},
            {"source": "softmax", "target": "output"}
        ]
    }

    compiler = GraphCompiler()
    
    # 1. Verify validate_pipeline succeeds with float dummy tensor input shape [2, 16]
    val_res = compiler.validate_pipeline(graph, [2, 16])
    assert val_res.get("status") != "error", f"validate_pipeline failed: {val_res.get('message')}"
    assert "node_shapes" in val_res
    assert val_res["node_shapes"]["embed"] == [2, 16, 64]

    # 2. Compile model and test forward pass
    model = compiler.compile(graph)
    
    # Dummy token input (batch=2, seq_len=16)
    x = torch.randint(0, 10000, (2, 16))
    out = model(x)
    assert out.shape == (2, 16, 10000)

    # 3. Verify CrossEntropy loss works when targets are 1D classification labels [2]
    class_targets = torch.tensor([0, 1])
    loss_fn = nn.CrossEntropyLoss()
    # Simulate Trainer._compute_loss shape adaptation
    outputs_pooled = out.mean(dim=1)
    loss_class = loss_fn(outputs_pooled, class_targets)
    loss_class.backward()
    assert loss_class.item() > 0
