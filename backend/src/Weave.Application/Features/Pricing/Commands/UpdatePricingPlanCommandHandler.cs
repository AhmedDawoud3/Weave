using MediatR;
using Microsoft.EntityFrameworkCore;
using Weave.Application.Features.Pricing.DTOs;
using Weave.Application.Interfaces;

namespace Weave.Application.Features.Pricing.Commands;

public class UpdatePricingPlanCommandHandler : IRequestHandler<UpdatePricingPlanCommand, PricingPlanDto?>
{
    private readonly IWeaveDbContext _context;

    public UpdatePricingPlanCommandHandler(IWeaveDbContext context)
    {
        _context = context;
    }

    public async Task<PricingPlanDto?> Handle(UpdatePricingPlanCommand request, CancellationToken cancellationToken)
    {
        var plan = await _context.PricingPlans.FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken);

        if (plan == null) return null;

        plan.Name = request.Name;
        plan.Description = request.Description;
        plan.PriceType = request.PriceType;
        plan.MonthlyPrice = request.MonthlyPrice;
        plan.YearlyPrice = request.YearlyPrice;
        plan.IsPopular = request.IsPopular;
        plan.CtaText = request.CtaText;
        plan.FeaturesJson = request.FeaturesJson;
        plan.MaxProjectsCount = request.MaxProjectsCount;
        plan.IsActive = request.IsActive;

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
