using MediatR;
using Microsoft.EntityFrameworkCore;
using Weave.Application.Interfaces;

namespace Weave.Application.Features.Pricing.Commands;

public class DeletePricingPlanCommandHandler : IRequestHandler<DeletePricingPlanCommand, bool>
{
    private readonly IWeaveDbContext _context;

    public DeletePricingPlanCommandHandler(IWeaveDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeletePricingPlanCommand request, CancellationToken cancellationToken)
    {
        var plan = await _context.PricingPlans.FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken);
        
        if (plan == null) return false;

        _context.PricingPlans.Remove(plan);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
