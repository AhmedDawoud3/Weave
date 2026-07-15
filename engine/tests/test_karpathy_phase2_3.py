import os
import json
import pytest
import torch
import torch.nn as nn
from fastapi.testclient import TestClient

from main import app
from training.diagnostics import DiagnosticsCollector

client = TestClient(app)

# Disable authentication for testing
os.environ["WEAVE_ENGINE_DISABLE_AUTH"] = "true"

def test_diagnostics_collector():
    # Construct a simple model with a Linear and SelfAttention layer
    from schemas import SelfAttentionNode, SelfAttentionParams
    from compiler.factory import ComponentFactory
    
    class SimpleModel(nn.Module):
        def __init__(self):
            super().__init__()
            self.linear = nn.Linear(8, 8)
            attn_node = SelfAttentionNode(
                id="attn_1",
                type="SelfAttention",
                params=SelfAttentionParams(embed_dim=8, num_heads=2, causal=True)
            )
            self.attn = ComponentFactory.create_layer(attn_node)
            
        def forward(self, x):
            x = self.linear(x)
            x = self.attn(x)
            return x

    model = SimpleModel()
    collector = DiagnosticsCollector(model, "test_run_123")
    collector.register_hooks()
    
    # Run forward pass
    x = torch.randn(2, 4, 8)
    out = model(x)
    
    # Run backward pass
    loss = out.sum()
    loss.backward()
    
    # Collect diagnostics for epoch 1
    collector.collect_epoch(epoch=1, lr=0.01)
    collector.remove_hooks()
    
    # Check if diagnostics file was saved
    assert os.path.exists(collector.filepath)
    
    with open(collector.filepath, encoding="utf-8") as f:
        data = json.load(f)
        
    assert len(data) == 1
    record = data[0]
    assert record["epoch"] == 1
    assert "linear" in record["activations"]
    assert "attn" in record["activations"]
    assert "linear.weight" in record["weights"]
    assert "linear.weight" in record["gradients"]
    assert "linear.weight" in record["update_ratio"]
    assert "attn" in record["attention"]  # Check self-attention heatmap is captured

    # Cleanup
    if os.path.exists(collector.filepath):
        os.remove(collector.filepath)

def test_api_tokenizer_and_generate(tmp_path):
    # 1. Train Tokenizer
    response = client.post("/tokenizer/train", json={
        "text_source": "paste",
        "text_content": "hello world! this is a tokenizer test. hello universe!",
        "vocab_size": 260,
        "special_tokens": ["<|endoftext|>"]
    })
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "success"
    tokenizer_id = res_data["tokenizer_id"]
    assert tokenizer_id is not None

    # 2. Get Vocab
    vocab_resp = client.get(f"/tokenizer/{tokenizer_id}/vocab")
    assert vocab_resp.status_code == 200
    vocab_data = vocab_resp.json()
    assert vocab_data["status"] == "success"
    assert len(vocab_data["vocab"]) >= 256

    # 3. Get Merges
    merges_resp = client.get(f"/tokenizer/{tokenizer_id}/merges")
    assert merges_resp.status_code == 200
    merges_data = merges_resp.json()
    assert merges_data["status"] == "success"
    assert "merges" in merges_data

    # 4. Encode text
    encode_resp = client.post("/tokenizer/encode", json={
        "tokenizer_id": tokenizer_id,
        "text": "hello tokenizer!"
    })
    assert encode_resp.status_code == 200
    encode_data = encode_resp.json()
    assert encode_data["status"] == "success"
    assert len(encode_data["tokens"]) > 0

    # 5. Decode text
    decode_resp = client.post("/tokenizer/decode", json={
        "tokenizer_id": tokenizer_id,
        "tokens": encode_data["tokens"]
    })
    assert decode_resp.status_code == 200
    decode_data = decode_resp.json()
    assert decode_data["status"] == "success"
    assert decode_data["text"] == "hello tokenizer!"

    # Cleanup tokenizers
    tok_file = f"../data/tokenizers/{tokenizer_id}.json"
    if os.path.exists(tok_file):
        os.remove(tok_file)

def test_export_project():
    payload = {
        "dataset_config": {
            "source": "predefined",
            "name": "MNIST",
            "split": "train",
        },
        "model_graph": {
            "nodes": [
                {
                    "id": "fc1",
                    "type": "Linear",
                    "params": {"in_features": 10, "out_features": 2},
                }
            ],
            "edges": [
                {"source": "input", "target": "fc1"},
                {"source": "fc1", "target": "output"},
            ],
        },
        "loss": {"type": "CrossEntropyLoss", "params": {}},
        "optimizer": {"type": "Adam", "params": {"lr": 0.01}},
        "training": {
            "epochs": 2,
            "device": "cpu",
        },
    }
    
    response = client.post("/export/project", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    assert len(response.content) > 0
