using System.Text.Json;
using Weave.Domain.Entities;
using Weave.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Weave.Infrastructure.Persistence;

public static class PricingPlanSeeder
{
    public static async Task SeedAsync(WeaveDbContext context)
    {
        if (await context.PricingPlans.AnyAsync())
        {
            return; // Already seeded
        }

        var hobbyFeatures = new[]
        {
            "Interactive Model Canvas Editor",
            "Standard conv/dense/transformer nodes",
            "Local compilation & export (PyTorch)",
            "Single workspace sandbox",
            "Community support"
        };

        var developerFeatures = new[]
        {
            "All features in Hobby",
            "Cloud GPU Training access",
            "Live SignalR training metrics stream",
            "Multi-run history comparison chart",
            "ONNX & TorchScript exporter",
            "Priority Discord support"
        };

        var enterpriseFeatures = new[]
        {
            "All features in Developer",
            "Dedicated GPU cluster scaling",
            "SAML SSO & Team management",
            "Custom autograd code execution",
            "API pipeline endpoints",
            "SLA & Dedicated account manager"
        };

        var plans = new List<PricingPlan>
        {
            new PricingPlan
            {
                Id = Guid.NewGuid().ToString(),
                Name = "Hobby",
                PriceType = "Fixed",
                MonthlyPrice = 0,
                YearlyPrice = 0,
                Description = "Perfect for students and developers learning neural network architectures.",
                CtaText = "Start Free",
                IsPopular = false,
                DisplayOrder = 0,
                IsActive = true,
                MaxProjectsCount = 1,
                FeaturesJson = JsonSerializer.Serialize(hobbyFeatures)
            },
            new PricingPlan
            {
                Id = Guid.NewGuid().ToString(),
                Name = "Developer",
                PriceType = "Fixed",
                MonthlyPrice = 15,
                YearlyPrice = 12,
                Description = "For deep learning engineers building, training, and optimizing real models.",
                CtaText = "Upgrade to Developer",
                IsPopular = true,
                DisplayOrder = 1,
                IsActive = true,
                MaxProjectsCount = 10,
                FeaturesJson = JsonSerializer.Serialize(developerFeatures)
            },
            new PricingPlan
            {
                Id = Guid.NewGuid().ToString(),
                Name = "Enterprise",
                PriceType = "Custom",
                MonthlyPrice = null,
                YearlyPrice = null,
                Description = "For teams and research labs requiring massive compute and integrations.",
                CtaText = "Contact Sales",
                IsPopular = false,
                DisplayOrder = 2,
                IsActive = true,
                MaxProjectsCount = 999,
                FeaturesJson = JsonSerializer.Serialize(enterpriseFeatures)
            }
        };

        context.PricingPlans.AddRange(plans);
        await context.SaveChangesAsync();
    }
}
