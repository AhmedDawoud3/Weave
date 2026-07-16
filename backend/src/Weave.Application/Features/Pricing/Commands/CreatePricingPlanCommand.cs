using MediatR;
using Weave.Application.Features.Pricing.DTOs;

namespace Weave.Application.Features.Pricing.Commands;

public class CreatePricingPlanCommand : IRequest<PricingPlanDto>
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string PriceType { get; set; } = "Fixed";
    public decimal? MonthlyPrice { get; set; }
    public decimal? YearlyPrice { get; set; }
    public bool IsPopular { get; set; }
    public string CtaText { get; set; } = "Start Free";
    public string FeaturesJson { get; set; } = "[]";
    public int MaxProjectsCount { get; set; }
}
