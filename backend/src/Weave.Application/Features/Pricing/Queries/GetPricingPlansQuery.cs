using MediatR;
using Weave.Application.Features.Pricing.DTOs;

namespace Weave.Application.Features.Pricing.Queries;

public class GetPricingPlansQuery : IRequest<IEnumerable<PricingPlanDto>>
{
    public bool IncludeInactive { get; set; } = false;
}
