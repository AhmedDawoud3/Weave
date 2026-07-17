using MediatR;
using Microsoft.EntityFrameworkCore;
using Weave.Application.Features.Pricing.DTOs;
using Weave.Domain.Entities;
using Weave.Application.Interfaces;

namespace Weave.Application.Features.Pricing.Commands;

public class CreatePricingPlanCommandHandler : IRequestHandler<CreatePricingPlanCommand, PricingPlanDto>
{
    private readonly IWeaveDbContext _context;

    public CreatePricingPlanCommandHandler(IWeaveDbContext context)
    {
        _context = context;
    }

    public async Task<PricingPlanDto> Handle(CreatePricingPlanCommand request, CancellationToken cancellationToken)
    {
        // Get max display order
        var maxOrder = await _context.PricingPlans.MaxAsync(p => (int?)p.DisplayOrder, cancellationToken) ?? 0;

        var plan = new PricingPlan
        {
            Id = Guid.NewGuid().ToString(),
            Name = request.Name,
            Description = request.Description,
            PriceType = request.PriceType,
            MonthlyPrice = request.MonthlyPrice,
            YearlyPrice = request.YearlyPrice,
            IsPopular = request.IsPopular,
            CtaText = request.CtaText,
            FeaturesJson = request.FeaturesJson,
            DisplayOrder = maxOrder + 1,
            IsActive = true,
            MaxProjectsCount = request.MaxProjectsCount
        };

        _context.PricingPlans.Add(plan);
        await _context.SaveChangesAsync(cancellationToken);

        return new PricingPlanDto
        {
            Id = plan.Id,
            Name = plan.Name,
            Description = plan.Description,
            PriceType = plan.PriceType,
            MonthlyPrice = plan.MonthlyPrice,
            YearlyPrice = plan.YearlyPrice,
            IsPopular = plan.IsPopular,
            CtaText = plan.CtaText,
            FeaturesJson = plan.FeaturesJson,
            DisplayOrder = plan.DisplayOrder,
            IsActive = plan.IsActive,
            MaxProjectsCount = plan.MaxProjectsCount
        };
    }
}
