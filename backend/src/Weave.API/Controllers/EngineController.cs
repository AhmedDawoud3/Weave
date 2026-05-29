using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Weave.Application.DTOs.Engine;
using Weave.Application.Interfaces;

namespace Weave.API.Controllers;

/// <summary>
/// REST API controller that proxies requests to the Python FastAPI engine.
/// Acts as the orchestration layer between the React frontend and the engine.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EngineController : ControllerBase
{
    private readonly IEngineOrchestrator _engine;

    public EngineController(IEngineOrchestrator engine)
    {
        _engine = engine;
    }

    /// <summary>
    /// Validate a full pipeline graph by simulating Pytorch.
    /// Proxies to POST http://127.0.0.1:8000/validate_pipeline
    /// </summary>
    [HttpPost("validate-pipeline")]
    public async Task<ActionResult<EngineResponseDto<PipelineValidationResponseDto>>> ValidatePipeline(
        [FromBody] PipelineValidationRequestDto dto,
        [FromServices] IValidator<PipelineValidationRequestDto> validator,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(dto, ct);
        if (!validation.IsValid)
        {
            return BadRequest(new EngineResponseDto<PipelineValidationResponseDto>
            {
                Status = "error",
                Message = string.Join("; ", validation.Errors.Select(e => e.ErrorMessage))
            });
        }

        var result = await _engine.ValidatePipelineAsync(dto, ct);
        return Ok(result);
    }

    /// <summary>
    /// Infer the output shape of a single layer.
    /// Proxies to POST http://127.0.0.1:8000/infer/layer
    /// </summary>
    [HttpPost("infer/layer")]
    public async Task<ActionResult<EngineResponseDto<ShapeInferenceResponseDto>>> InferLayerShape(
        [FromBody] ShapeInferenceRequestDto dto,
        [FromServices] IValidator<ShapeInferenceRequestDto> validator,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(dto, ct);
        if (!validation.IsValid)
        {
            return BadRequest(new EngineResponseDto<ShapeInferenceResponseDto>
            {
                Status = "error",
                Message = string.Join("; ", validation.Errors.Select(e => e.ErrorMessage))
            });
        }

        var result = await _engine.InferLayerShapeAsync(dto, ct);
        return Ok(result);
    }

    /// <summary>
    /// Infer tensor shapes for a dataset configuration.
    /// Proxies to POST http://127.0.0.1:8000/infer/dataset
    /// </summary>
    [HttpPost("infer/dataset")]
    public async Task<ActionResult<EngineResponseDto<DatasetShapeInferenceResponseDto>>> InferDatasetShape(
        [FromBody] DatasetShapeInferenceRequestDto dto,
        CancellationToken ct)
    {
        var result = await _engine.InferDatasetShapeAsync(dto, ct);
        return Ok(result);
    }
}
