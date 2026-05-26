using System.Text.Json.Serialization;

namespace Weave.Application.DTOs.Engine;

// =============================================================================
// REQUEST / RESPONSE DTOs — Mirror Python schemas.py Section 16
// =============================================================================

#region Pipeline Validation

/// <summary>
/// POST /validate_pipeline — full graph tensor flow simulation.
/// </summary>
public class PipelineValidationRequestDto
{
    [JsonPropertyName("graph")]
    public GraphConfigDto Graph { get; set; } = new();

    [JsonPropertyName("input_shape")]
    public List<int> InputShape { get; set; } = new();
}

public class PipelineValidationResponseDto
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("node_shapes")]
    public Dictionary<string, List<int>>? NodeShapes { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }
}

#endregion

#region Layer Shape Inference

/// <summary>
/// POST /infer/layer — single layer output dimension calculation.
/// </summary>
public class ShapeInferenceRequestDto
{
    [JsonPropertyName("node")]
    public NodeConfigDto Node { get; set; } = new();

    [JsonPropertyName("input_shape")]
    public List<int> InputShape { get; set; } = new();

    [JsonPropertyName("input_shapes")]
    public List<List<int>>? InputShapes { get; set; }
}

public class ShapeInferenceResponseDto
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("output_shape")]
    public List<int>? OutputShape { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }
}

#endregion

#region Dataset Shape Inference

/// <summary>
/// POST /infer/dataset — tensor shapes for dataset configurations.
/// </summary>
public class DatasetShapeInferenceRequestDto
{
    [JsonPropertyName("dataset_config")]
    public object DatasetConfig { get; set; } = new();
}

public class DatasetShapeInferenceResponseDto
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("per_sample_shape")]
    public List<int>? PerSampleShape { get; set; }

    [JsonPropertyName("batch_shape")]
    public List<int>? BatchShape { get; set; }

    [JsonPropertyName("num_classes")]
    public int? NumClasses { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }
}

#endregion

#region Engine Wrapper Response

/// <summary>
/// Standard envelope for all engine responses proxied through .NET.
/// Matches the {"status", "message", "data"} pattern.
/// </summary>
public class EngineResponseDto<T>
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = "success";

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("data")]
    public T? Data { get; set; }
}

#endregion
