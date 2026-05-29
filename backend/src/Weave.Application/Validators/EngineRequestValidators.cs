using FluentValidation;
using Weave.Application.DTOs.Engine;

namespace Weave.Application.Validators;

/// <summary>
/// Validates pipeline validation requests to ensure structural correctness
/// before forwarding to the Python engine.
/// </summary>
public class PipelineValidationRequestValidator : AbstractValidator<PipelineValidationRequestDto>
{
    public PipelineValidationRequestValidator()
    {
        RuleFor(x => x.Graph).NotNull().WithMessage("Graph configuration is required.");

        RuleFor(x => x.Graph.Nodes)
            .NotEmpty().WithMessage("Graph must contain at least one node.")
            .When(x => x.Graph is not null);

        RuleFor(x => x.Graph.Edges)
            .NotEmpty().WithMessage("Graph must contain at least one edge.")
            .When(x => x.Graph is not null);

        RuleFor(x => x.InputShape)
            .NotEmpty().WithMessage("Input shape is required.")
            .Must(s => s.Count >= 2).WithMessage("Input shape must have at least 2 dimensions (batch + features).");

        RuleForEach(x => x.InputShape)
            .GreaterThan(0).WithMessage("Each input shape dimension must be positive.");
    }
}

/// <summary>
/// Validates shape inference requests for single layers.
/// </summary>
public class ShapeInferenceRequestValidator : AbstractValidator<ShapeInferenceRequestDto>
{
    public ShapeInferenceRequestValidator()
    {
        RuleFor(x => x.Node).NotNull().WithMessage("Node configuration is required.");

        RuleFor(x => x.Node.Id)
            .NotEmpty().WithMessage("Node ID is required.")
            .When(x => x.Node is not null);

        RuleFor(x => x.Node.Type)
            .NotEmpty().WithMessage("Node type is required.")
            .When(x => x.Node is not null);

        RuleFor(x => x.InputShape)
            .NotEmpty().WithMessage("Input shape is required.");

        RuleForEach(x => x.InputShape)
            .GreaterThan(0).WithMessage("Each input shape dimension must be positive.");
    }
}
