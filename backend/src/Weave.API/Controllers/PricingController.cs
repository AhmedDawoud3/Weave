using MediatR;
using Microsoft.AspNetCore.Mvc;
using Weave.Application.Features.Pricing.DTOs;
using Weave.Application.Features.Pricing.Queries;

namespace Weave.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PricingController : ControllerBase
{
    private readonly IMediator _mediator;

    public PricingController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PricingPlanDto>>> GetPricingPlans(CancellationToken ct)
    {
        var query = new GetPricingPlansQuery { IncludeInactive = false };
        var plans = await _mediator.Send(query, ct);
        return Ok(plans);
    }
}
