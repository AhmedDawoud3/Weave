using MediatR;

namespace Weave.Application.Features.Pricing.Commands;

public class DeletePricingPlanCommand : IRequest<bool>
{
    public string Id { get; set; } = string.Empty;

    public DeletePricingPlanCommand(string id)
    {
        Id = id;
    }
}
