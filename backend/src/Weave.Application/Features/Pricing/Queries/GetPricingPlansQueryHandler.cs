using MediatR;
using Microsoft.EntityFrameworkCore;
using Weave.Application.Features.Pricing.DTOs;
using Weave.Application.Interfaces;

namespace Weave.Application.Features.Pricing.Queries;

public class GetPricingPlansQueryHandler : IRequestHandler<GetPricingPlansQuery, IEnumerable<PricingPlanDto>>
{
    private readonly IWeaveDbContext _context;

    public GetPricingPlansQueryHandler(IWeaveDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<PricingPlanDto>> Handle(GetPricingPlansQuery request, CancellationToken cancellationToken)
    {
        var query = _context.PricingPlans.AsQueryable();

        if (!request.IncludeInactive)
        {
            query = query.Where(p => p.IsActive);
        }

        var plans = await query
            .OrderBy(p => p.DisplayOrder)
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
            .ToListAsync(cancellationToken);

        return plans;
    }
}
