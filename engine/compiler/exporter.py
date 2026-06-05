"""
exporter.py — Model Exporters for ONNX, PyTorch, and TorchScript formats.
==========================================================================
Handles loading weights from a checkpoint path and saving compiled model graphs.
"""

from typing import Any
import torch
import torch.nn as nn
from compiler.compiler import GraphCompiler
from schemas import ExportRequest


def load_checkpoint_model(graph: Any, checkpoint_path: str) -> nn.Module:
    """Builds the model from graph config and loads weights from checkpoint.

    Args:
        graph (Any): GraphConfig schema mapping.
        checkpoint_path (str): Filepath to PyTorch checkpoint (.pt).

    Returns:
        nn.Module: Loaded PyTorch module in evaluation mode.

    Raises:
        ValueError: If checkpoint loading fails.
    """
    compiler = GraphCompiler()
    model = compiler.compile(graph)

    try:
        checkpoint = torch.load(checkpoint_path, map_location="cpu")
        if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
            model.load_state_dict(checkpoint["model_state_dict"])
        else:
            model.load_state_dict(checkpoint)
    except Exception as e:
        raise ValueError(
            f"Failed to load checkpoint from '{checkpoint_path}': {e}"
        ) from e

    model.eval()
    return model


def export_onnx(request: ExportRequest) -> str:
    """Exports the compiled model to ONNX format with dynamic batch axis.

    Args:
        request (ExportRequest): Configuration parameters for the export.

    Returns:
        str: Absolute filepath of the saved ONNX file.

    Raises:
        RuntimeError: If ONNX tracing fails.
    """
    model = load_checkpoint_model(request.graph, request.checkpoint_path)
    dummy_input = torch.randn(request.input_shape)

    try:
        torch.onnx.export(
            model,
            dummy_input,
            request.output_path,
            export_params=True,
            opset_version=request.opset_version or 17,
            do_constant_folding=True,
            input_names=["input"],
            output_names=["output"],
            dynamic_axes={
                "input": {0: "batch_size"},
                "output": {0: "batch_size"},
            },
        )
    except Exception as e:
        raise RuntimeError(f"ONNX export tracing failed: {e}") from e

    return request.output_path


def export_pytorch(request: ExportRequest) -> str:
    """Saves the raw state_dict of the loaded model.

    Args:
        request (ExportRequest): Configuration parameters for the export.

    Returns:
        str: Filepath where weights were saved.

    Raises:
        RuntimeError: If weights saving fails.
    """
    model = load_checkpoint_model(request.graph, request.checkpoint_path)

    try:
        torch.save(model.state_dict(), request.output_path)
    except Exception as e:
        raise RuntimeError(f"PyTorch state_dict save failed: {e}") from e

    return request.output_path


def export_torchscript(request: ExportRequest) -> str:
    """Traces and serializes the model to platform-independent TorchScript format.

    Args:
        request (ExportRequest): Configuration parameters for the export.

    Returns:
        str: Filepath where the TorchScript binary was saved.

    Raises:
        RuntimeError: If TorchScript serialization fails.
    """
    model = load_checkpoint_model(request.graph, request.checkpoint_path)
    dummy_input = torch.randn(request.input_shape)

    try:
        traced_model = torch.jit.trace(model, dummy_input)
        traced_model.save(request.output_path)
    except Exception as e:
        raise RuntimeError(f"TorchScript tracing failed: {e}") from e

    return request.output_path
