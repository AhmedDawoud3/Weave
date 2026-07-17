using MediatR;
using Microsoft.EntityFrameworkCore;
using Weave.Application.Features.Pricing.DTOs;
using Weave.Application.Interfaces;

namespace Weave.Application.Features.Pricing.Queries;

public class GetPricingPlanByIdQueryHandler : IRequestHandler<GetPricingPlanByIdQuery, PricingPlanDto?>
{
    private readonly IWeaveDbContext _context;

    public GetPricingPlanByIdQueryHandler(IWeaveDbContext context)
    {
        _context = context;
    }

    public async Task<PricingPlanDto?> Handle(GetPricingPlanByIdQuery request, CancellationToken cancellationToken)
    {
        var plan = await _context.PricingPlans
            .Where(p => p.Id == request.Id)
            .Select(p => new PricingPlanDto
            {
                Id = p.Id,
                Name = p.Name,
                Description = p.Description,
                PriceType = p.PriceType,
                MonthlyPrice = p.MonthlyPrice,
                YearlyPrice = p.YearlyPrice,
                IsPopular = p.IsPopular,
                CtaText = p.CtaText,
                FeaturesJson = p.FeaturesJson,
                DisplayOrder = p.DisplayOrder,
                IsActive = p.IsActive,
                MaxProjectsCount = p.MaxProjectsCount
            })
            .FirstOrDefaultAsync(cancellationToken);

        return plan;
    }
}
