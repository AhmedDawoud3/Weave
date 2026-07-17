namespace Weave.Domain.Entities;

public class PricingPlan
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    
    /// <summary>
    /// e.g. "Fixed", "Custom"
    /// </summary>
    public string PriceType { get; set; } = "Fixed";
    
    public decimal? MonthlyPrice { get; set; }
    public decimal? YearlyPrice { get; set; }
    
    public bool IsPopular { get; set; } = false;
    public string CtaText { get; set; } = "Start Free";
    
    /// <summary>
    /// JSON array of features
    /// </summary>
    public string FeaturesJson { get; set; } = "[]";
    
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;

    // Additional config properties if needed
    public int MaxProjectsCount { get; set; }
}
