using Microsoft.EntityFrameworkCore;
using Weave.Domain.Entities;

namespace Weave.Application.Interfaces;

public interface IWeaveDbContext
{
    DbSet<PricingPlan> PricingPlans { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
