using FluentValidation;

namespace Weave.Application.Features.Pricing.Commands;

public class UpdatePricingPlanCommandValidator : AbstractValidator<UpdatePricingPlanCommand>
{
    public UpdatePricingPlanCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.PriceType).NotEmpty().MaximumLength(50);
        RuleFor(x => x.CtaText).NotEmpty().MaximumLength(50);

        RuleFor(x => x.MonthlyPrice)
            .NotNull()
            .When(x => x.PriceType == "Fixed")
            .WithMessage("Monthly price is required for fixed pricing.");

        RuleFor(x => x.YearlyPrice)
            .NotNull()
            .When(x => x.PriceType == "Fixed")
            .WithMessage("Yearly price is required for fixed pricing.");
    }
}
