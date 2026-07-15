using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Weave.Application.DTOs.Engine;
using Weave.Application.Interfaces;

namespace Weave.Infrastructure.Engine;

/// <summary>
/// Typed HttpClient that communicates with the FastAPI Python Backend
/// at http://127.0.0.1:8000. Wraps all responses in the standard
/// EngineResponseDto envelope.
/// </summary>
public class EngineClient : IEngineOrchestrator
{
    private readonly HttpClient _http;
    private readonly ILogger<EngineClient> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true
    };

    public EngineClient(HttpClient http, ILogger<EngineClient> logger)
    {
        _http = http;
        _logger = logger;
    }

    public async Task<EngineResponseDto<PipelineValidationResponseDto>> ValidatePipelineAsync(
        PipelineValidationRequestDto request, CancellationToken ct = default)
    {
        return await PostToEngineAsync<PipelineValidationRequestDto, PipelineValidationResponseDto>(
            "/validate_pipeline", request, ct);
    }

    public async Task<EngineResponseDto<ShapeInferenceResponseDto>> InferLayerShapeAsync(
        ShapeInferenceRequestDto request, CancellationToken ct = default)
    {
        return await PostToEngineAsync<ShapeInferenceRequestDto, ShapeInferenceResponseDto>(
            "/infer/layer", request, ct);
    }

    public async Task<EngineResponseDto<DatasetShapeInferenceResponseDto>> InferDatasetShapeAsync(
        DatasetShapeInferenceRequestDto request, CancellationToken ct = default)
    {
        return await PostToEngineAsync<DatasetShapeInferenceRequestDto, DatasetShapeInferenceResponseDto>(
            "/infer/dataset", request, ct);
    }

    /// <summary>
    /// Generic helper that POSTs to the engine and wraps the response.
    /// </summary>
    private async Task<EngineResponseDto<TResponse>> PostToEngineAsync<TRequest, TResponse>(
        string endpoint, TRequest request, CancellationToken ct)
    {
        try
        {
            _logger.LogInformation("Sending request to engine: POST {Endpoint}", endpoint);

            var response = await _http.PostAsJsonAsync(endpoint, request, JsonOptions, ct);
            var content = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Engine returned {StatusCode} for {Endpoint}: {Content}",
                    response.StatusCode, endpoint, content);

                return new EngineResponseDto<TResponse>
                {
                    Status = "error",
                    Message = $"Engine returned HTTP {(int)response.StatusCode}: {content}"
                };
            }

            var result = JsonSerializer.Deserialize<TResponse>(content, JsonOptions);

            return new EngineResponseDto<TResponse>
            {
                Status = "success",
                Data = result
            };
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to connect to engine at {Endpoint}", endpoint);
            return new EngineResponseDto<TResponse>
            {
                Status = "error",
                Message = "Cannot reach the Python engine. Ensure it is running on http://127.0.0.1:8000"
            };
        }
        catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException)
        {
            _logger.LogError(ex, "Engine request timed out for {Endpoint}", endpoint);
            return new EngineResponseDto<TResponse>
            {
                Status = "error",
                Message = "Engine request timed out. The computation may be too complex."
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error communicating with engine at {Endpoint}", endpoint);
            return new EngineResponseDto<TResponse>
            {
                Status = "error",
                Message = $"Unexpected engine error: {ex.Message}"
            };
        }
    }

    public async Task<object> TrainTokenizerAsync(object request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("/tokenizer/train", request, ct);
        return await response.Content.ReadFromJsonAsync<object>(cancellationToken: ct) ?? new { status = "error", message = "Empty response" };
    }

    public async Task<object> GetTokenizerVocabAsync(string id, CancellationToken ct = default)
    {
        return await _http.GetFromJsonAsync<object>($"/tokenizer/{id}/vocab", ct) ?? new { status = "error", message = "Empty response" };
    }

    public async Task<object> GetTokenizerMergesAsync(string id, CancellationToken ct = default)
    {
        return await _http.GetFromJsonAsync<object>($"/tokenizer/{id}/merges", ct) ?? new { status = "error", message = "Empty response" };
    }

    public async Task<object> TokenizerEncodeAsync(object request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("/tokenizer/encode", request, ct);
        return await response.Content.ReadFromJsonAsync<object>(cancellationToken: ct) ?? new { status = "error", message = "Empty response" };
    }

    public async Task<object> TokenizerDecodeAsync(object request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("/tokenizer/decode", request, ct);
        return await response.Content.ReadFromJsonAsync<object>(cancellationToken: ct) ?? new { status = "error", message = "Empty response" };
    }

    public async Task<byte[]> ExportProjectAsync(object request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("/export/project", request, ct);
        return await response.Content.ReadAsByteArrayAsync(ct);
    }
}
