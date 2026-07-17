using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Weave.Application.Features.Pricing.Commands;
using Weave.Application.Features.Pricing.DTOs;
using Weave.Application.Features.Pricing.Queries;

namespace Weave.API.Controllers;

[ApiController]
[Route("api/admin/pricing")]
[Authorize(Roles = "Admin")]
public class AdminPricingController : ControllerBase
{
    private readonly IMediator _mediator;

    public AdminPricingController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PricingPlanDto>>> GetAllPricingPlans(CancellationToken ct)
    {
        var query = new GetPricingPlansQuery { IncludeInactive = true };
        var plans = await _mediator.Send(query, ct);
        return Ok(plans);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PricingPlanDto>> GetPricingPlan(string id, CancellationToken ct)
    {
        var query = new GetPricingPlanByIdQuery(id);
        var plan = await _mediator.Send(query, ct);
        
        if (plan == null) return NotFound();
        return Ok(plan);
    }

    [HttpPost]
    public async Task<ActionResult<PricingPlanDto>> CreatePricingPlan([FromBody] CreatePricingPlanCommand command, CancellationToken ct)
    {
        var plan = await _mediator.Send(command, ct);
        return CreatedAtAction(nameof(GetPricingPlan), new { id = plan.Id }, plan);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<PricingPlanDto>> UpdatePricingPlan(string id, [FromBody] UpdatePricingPlanCommand command, CancellationToken ct)
    {
        command.Id = id;
        var plan = await _mediator.Send(command, ct);
        
        if (plan == null) return NotFound();
        return Ok(plan);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePricingPlan(string id, CancellationToken ct)
    {
        var command = new DeletePricingPlanCommand(id);
        var success = await _mediator.Send(command, ct);
        
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPost("reorder")]
    public async Task<IActionResult> ReorderPricingPlans([FromBody] ReorderPricingPlansCommand command, CancellationToken ct)
    {
        await _mediator.Send(command, ct);
        return Ok();
    }
}
