import math
import pytest
import torch
import torch.nn as nn
from schemas import (
    Conv1dNode,
    Conv1dParams,
    MaxPool1dNode,
    MaxPool1dParams,
    BatchNorm1dNode,
    BatchNorm1dParams,
    FlattenConsecutiveNode,
    FlattenConsecutiveParams,
    SelfAttentionNode,
    SelfAttentionParams,
    PositionalEncodingNode,
    PositionalEncodingParams,
    FeedForwardNode,
    FeedForwardParams,
    LeakyReLUNode,
    LeakyReLUParams,
    SiLUNode,
    SiLUParams,
    ELUNode,
    ELUParams,
    PReLUNode,
    PReLUParams,
    TextDatasetConfig,
)
from compiler.factory import ComponentFactory
from dataset.text_lm_dataset import CharLMDataset
from dataset.dataset_factory import get_dataset_from_config


def test_sequence_layers():
    # 1. Conv1d
    conv1d_node = Conv1dNode(
        id="conv1d_1",
        type="Conv1d",
        params=Conv1dParams(
            in_channels=4,
            out_channels=8,
            kernel_size=3,
            stride=1,
            padding=1,
            init_scheme="xavier_uniform",
        ),
    )
    module = ComponentFactory.create_layer(conv1d_node)
    assert isinstance(module, nn.Conv1d)
    x = torch.randn(2, 4, 16)
    out = module(x)
    assert out.shape == (2, 8, 16)

    # 2. MaxPool1d
    pool1d_node = MaxPool1dNode(
        id="pool1d_1",
        type="MaxPool1d",
        params=MaxPool1dParams(kernel_size=2, stride=2),
    )
    module = ComponentFactory.create_layer(pool1d_node)
    assert isinstance(module, nn.MaxPool1d)
    out = module(out)
    assert out.shape == (2, 8, 8)

    # 3. BatchNorm1d
    bn1d_node = BatchNorm1dNode(
        id="bn1d_1",
        type="BatchNorm1d",
        params=BatchNorm1dParams(num_features=8),
    )
    module = ComponentFactory.create_layer(bn1d_node)
    assert isinstance(module, nn.BatchNorm1d)
    out = module(out)
    assert out.shape == (2, 8, 8)

    # 4. FlattenConsecutive
    flatten_node = FlattenConsecutiveNode(
        id="flatten_1",
        type="FlattenConsecutive",
        params=FlattenConsecutiveParams(n=2),
    )
    module = ComponentFactory.create_layer(flatten_node)
    # input: (B, T, C) -> we transpose out to be (2, 8, 8) in (B, T, C) -> (2, 8, 8)
    # T=8, C=8. FlattenConsecutive n=2 -> T'=4, C'=16
    x_seq = out.transpose(1, 2)  # (2, 8, 8)
    out_seq = module(x_seq)
    assert out_seq.shape == (2, 4, 16)


def test_transformer_primitives():
    # 1. SelfAttention
    attn_node = SelfAttentionNode(
        id="attn_1",
        type="SelfAttention",
        params=SelfAttentionParams(embed_dim=16, num_heads=2, causal=True),
    )
    module = ComponentFactory.create_layer(attn_node)
    x = torch.randn(2, 4, 16)
    out = module(x)
    assert out.shape == (2, 4, 16)

    # 2. PositionalEncoding
    pe_node = PositionalEncodingNode(
        id="pe_1",
        type="PositionalEncoding",
        params=PositionalEncodingParams(embed_dim=16, max_seq_len=10, pe_type="sinusoidal"),
    )
    module = ComponentFactory.create_layer(pe_node)
    out_pe = module(x)
    assert out_pe.shape == (2, 4, 16)

    # 3. FeedForward
    ff_node = FeedForwardNode(
        id="ff_1",
        type="FeedForward",
        params=FeedForwardParams(embed_dim=16, expansion=4),
    )
    module = ComponentFactory.create_layer(ff_node)
    out_ff = module(x)
    assert out_ff.shape == (2, 4, 16)


def test_custom_activations():
    # LeakyReLU
    node = LeakyReLUNode(id="act_1", type="LeakyReLU", params=LeakyReLUParams(negative_slope=0.1))
    module = ComponentFactory.create_layer(node)
    assert isinstance(module, nn.LeakyReLU)

    # SiLU
    node = SiLUNode(id="act_2", type="SiLU", params=SiLUParams())
    module = ComponentFactory.create_layer(node)
    assert isinstance(module, nn.SiLU)

    # ELU
    node = ELUNode(id="act_3", type="ELU", params=ELUParams(alpha=1.0))
    module = ComponentFactory.create_layer(node)
    assert isinstance(module, nn.ELU)

    # PReLU
    node = PReLUNode(id="act_4", type="PReLU", params=PReLUParams(num_parameters=1, init=0.25))
    module = ComponentFactory.create_layer(node)
    assert isinstance(module, nn.PReLU)


def test_weight_init_auto():
    # Linear smart default (Kaiming uniform)
    from schemas import LinearNode, LinearParams
    node = LinearNode(
        id="lin_1",
        type="Linear",
        params=LinearParams(in_features=10, out_features=20, init_scheme="auto"),
    )
    module = ComponentFactory.create_layer(node)
    assert isinstance(module, nn.Linear)
    # Check that weights are not all zeros or ones
    assert not torch.allclose(module.weight, torch.zeros_like(module.weight))


def test_text_dataset():
    config = TextDatasetConfig(
        source="text",
        text_source="builtin",
        builtin_name="names",
        tokenization="char",
        context_length=8,
        train_split=0.9,
    )
    ds = get_dataset_from_config(config)
    assert isinstance(ds, CharLMDataset)
    assert ds.vocab_size == 27  # a-z + \n
    x, y = ds[0]
    assert x.shape == (8,)
    assert y.shape == (8,)
