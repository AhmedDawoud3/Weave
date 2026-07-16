namespace Weave.Application.Features.Pricing.DTOs;

public class PricingPlanDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string PriceType { get; set; } = string.Empty;
    public decimal? MonthlyPrice { get; set; }
    public decimal? YearlyPrice { get; set; }
    public bool IsPopular { get; set; }
    public string CtaText { get; set; } = string.Empty;
    public string FeaturesJson { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
    public int MaxProjectsCount { get; set; }
}
