using MediatR;
using Weave.Application.Features.Pricing.DTOs;

namespace Weave.Application.Features.Pricing.Queries;

public class GetPricingPlanByIdQuery : IRequest<PricingPlanDto?>
{
    public string Id { get; set; } = string.Empty;

    public GetPricingPlanByIdQuery(string id)
    {
        Id = id;
    }
}
