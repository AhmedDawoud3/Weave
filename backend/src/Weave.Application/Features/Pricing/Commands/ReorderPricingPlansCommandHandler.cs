using MediatR;
using Microsoft.EntityFrameworkCore;
using Weave.Application.Interfaces;

namespace Weave.Application.Features.Pricing.Commands;

public class ReorderPricingPlansCommandHandler : IRequestHandler<ReorderPricingPlansCommand, bool>
{
    private readonly IWeaveDbContext _context;

    public ReorderPricingPlansCommandHandler(IWeaveDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(ReorderPricingPlansCommand request, CancellationToken cancellationToken)
    {
        var plans = await _context.PricingPlans.ToListAsync(cancellationToken);

        for (int i = 0; i < request.PlanIds.Count; i++)
        {
            var plan = plans.FirstOrDefault(p => p.Id == request.PlanIds[i]);
            if (plan != null)
            {
                plan.DisplayOrder = i;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
