using System.Text.Json.Serialization;

namespace Weave.Application.DTOs.Engine;

// =============================================================================
// LAYER PARAMETER DTOs — Mirror Python engine schemas.py Section 1
// =============================================================================

#region Convolution & Pooling

public class Conv2dParamsDto
{
    [JsonPropertyName("in_channels")]
    public int InChannels { get; set; }

    [JsonPropertyName("out_channels")]
    public int OutChannels { get; set; }

    [JsonPropertyName("kernel_size")]
    public int KernelSize { get; set; }

    [JsonPropertyName("stride")]
    public int Stride { get; set; } = 1;

    [JsonPropertyName("padding")]
    public int Padding { get; set; } = 0;

    [JsonPropertyName("dilation")]
    public int Dilation { get; set; } = 1;

    [JsonPropertyName("groups")]
    public int Groups { get; set; } = 1;

    [JsonPropertyName("bias")]
    public bool Bias { get; set; } = true;
}

public class ConvTranspose2dParamsDto
{
    [JsonPropertyName("in_channels")]
    public int InChannels { get; set; }

    [JsonPropertyName("out_channels")]
    public int OutChannels { get; set; }

    [JsonPropertyName("kernel_size")]
    public int KernelSize { get; set; }

    [JsonPropertyName("stride")]
    public int Stride { get; set; } = 1;

    [JsonPropertyName("padding")]
    public int Padding { get; set; } = 0;

    [JsonPropertyName("output_padding")]
    public int OutputPadding { get; set; } = 0;

    [JsonPropertyName("bias")]
    public bool Bias { get; set; } = true;
}

public class MaxPool2dParamsDto
{
    [JsonPropertyName("kernel_size")]
    public int KernelSize { get; set; }

    [JsonPropertyName("stride")]
    public int? Stride { get; set; }

    [JsonPropertyName("padding")]
    public int Padding { get; set; } = 0;
}

public class AvgPool2dParamsDto
{
    [JsonPropertyName("kernel_size")]
    public int KernelSize { get; set; }

    [JsonPropertyName("stride")]
    public int? Stride { get; set; }

    [JsonPropertyName("padding")]
    public int Padding { get; set; } = 0;
}

public class AdaptiveAvgPool2dParamsDto
{
    [JsonPropertyName("output_size")]
    public object OutputSize { get; set; } = 1; // int or int[]
}

#endregion

#region Linear & Embedding

public class LinearParamsDto
{
    [JsonPropertyName("in_features")]
    public int InFeatures { get; set; }

    [JsonPropertyName("out_features")]
    public int OutFeatures { get; set; }

    [JsonPropertyName("bias")]
    public bool Bias { get; set; } = true;
}

public class EmbeddingParamsDto
{
    [JsonPropertyName("num_embeddings")]
    public int NumEmbeddings { get; set; }

    [JsonPropertyName("embedding_dim")]
    public int EmbeddingDim { get; set; }

    [JsonPropertyName("padding_idx")]
    public int? PaddingIdx { get; set; }
}

#endregion

#region Normalization

public class BatchNorm2dParamsDto
{
    [JsonPropertyName("num_features")]
    public int NumFeatures { get; set; }

    [JsonPropertyName("eps")]
    public double Eps { get; set; } = 1e-5;

    [JsonPropertyName("momentum")]
    public double Momentum { get; set; } = 0.1;

    [JsonPropertyName("affine")]
    public bool Affine { get; set; } = true;
}

public class LayerNormParamsDto
{
    [JsonPropertyName("normalized_shape")]
    public object NormalizedShape { get; set; } = 0; // int or int[]

    [JsonPropertyName("eps")]
    public double Eps { get; set; } = 1e-5;
}

public class GroupNormParamsDto
{
    [JsonPropertyName("num_groups")]
    public int NumGroups { get; set; }

    [JsonPropertyName("num_channels")]
    public int NumChannels { get; set; }

    [JsonPropertyName("eps")]
    public double Eps { get; set; } = 1e-5;
}

#endregion

#region Activations

public class ReLUParamsDto
{
    [JsonPropertyName("inplace")]
    public bool Inplace { get; set; } = false;
}

public class GELUParamsDto
{
    [JsonPropertyName("approximate")]
    public string Approximate { get; set; } = "none";
}

public class SigmoidParamsDto { }

public class TanhParamsDto { }

public class SoftmaxParamsDto
{
    [JsonPropertyName("dim")]
    public int Dim { get; set; }
}

#endregion

#region Shape Manipulation

public class FlattenParamsDto
{
    [JsonPropertyName("start_dim")]
    public int StartDim { get; set; } = 1;

    [JsonPropertyName("end_dim")]
    public int EndDim { get; set; } = -1;
}

public class ReshapeParamsDto
{
    [JsonPropertyName("target_shape")]
    public List<int> TargetShape { get; set; } = new();
}

public class PermuteParamsDto
{
    [JsonPropertyName("dims")]
    public List<int> Dims { get; set; } = new();
}

#endregion

#region Regularization

public class DropoutParamsDto
{
    [JsonPropertyName("p")]
    public double P { get; set; } = 0.5;

    [JsonPropertyName("inplace")]
    public bool Inplace { get; set; } = false;
}

public class Dropout2dParamsDto
{
    [JsonPropertyName("p")]
    public double P { get; set; } = 0.5;

    [JsonPropertyName("inplace")]
    public bool Inplace { get; set; } = false;
}

#endregion

#region Multi-Input Operations

public class AddParamsDto { }

public class ConcatParamsDto
{
    [JsonPropertyName("dim")]
    public int Dim { get; set; } = 1;
}

public class MultiplyParamsDto { }

#endregion
