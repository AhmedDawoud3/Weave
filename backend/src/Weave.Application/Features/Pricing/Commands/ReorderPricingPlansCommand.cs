using MediatR;

namespace Weave.Application.Features.Pricing.Commands;

public class ReorderPricingPlansCommand : IRequest<bool>
{
    // A list of plan IDs in the desired order
    public List<string> PlanIds { get; set; } = new();
}
