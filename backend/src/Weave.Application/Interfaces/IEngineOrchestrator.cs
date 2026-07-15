using Weave.Application.DTOs.Engine;

namespace Weave.Application.Interfaces;

/// <summary>
/// Orchestrator contract for proxying requests to the Python FastAPI engine.
/// All engine responses are wrapped in the standard EngineResponseDto envelope.
/// </summary>
public interface IEngineOrchestrator
{
    /// <summary>
    /// Validates a full graph pipeline by simulating tensor flow through all nodes.
    /// Proxies to POST http://127.0.0.1:8000/validate_pipeline
    /// </summary>
    Task<EngineResponseDto<PipelineValidationResponseDto>> ValidatePipelineAsync(
        PipelineValidationRequestDto request, CancellationToken ct = default);

    /// <summary>
    /// Infers the output shape of a single layer given an input shape.
    /// Proxies to POST http://127.0.0.1:8000/infer/layer
    /// </summary>
    Task<EngineResponseDto<ShapeInferenceResponseDto>> InferLayerShapeAsync(
        ShapeInferenceRequestDto request, CancellationToken ct = default);

    /// <summary>
    /// Infers tensor shapes for a dataset configuration.
    /// Proxies to POST http://127.0.0.1:8000/infer/dataset
    /// </summary>
    Task<EngineResponseDto<DatasetShapeInferenceResponseDto>> InferDatasetShapeAsync(
        DatasetShapeInferenceRequestDto request, CancellationToken ct = default);

    Task<object> TrainTokenizerAsync(object request, CancellationToken ct = default);
    Task<object> GetTokenizerVocabAsync(string id, CancellationToken ct = default);
    Task<object> GetTokenizerMergesAsync(string id, CancellationToken ct = default);
    Task<object> TokenizerEncodeAsync(object request, CancellationToken ct = default);
    Task<object> TokenizerDecodeAsync(object request, CancellationToken ct = default);
    Task<byte[]> ExportProjectAsync(object request, CancellationToken ct = default);
}
