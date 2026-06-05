using FluentValidation;
using Weave.Application.DTOs.Projects;

namespace Weave.Application.Validators;

public class CreateProjectValidator : AbstractValidator<CreateProjectDto>
{
    public CreateProjectValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Project name is required.")
            .MaximumLength(200).WithMessage("Project name must not exceed 200 characters.");

        RuleFor(x => x.Description)
            .MaximumLength(2000).WithMessage("Description must not exceed 2000 characters.")
            .When(x => x.Description is not null);
    }
}

public class UpdateProjectValidator : AbstractValidator<UpdateProjectDto>
{
    public UpdateProjectValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Project name is required.")
            .MaximumLength(200).WithMessage("Project name must not exceed 200 characters.");

        RuleFor(x => x.Description)
            .MaximumLength(2000).WithMessage("Description must not exceed 2000 characters.")
            .When(x => x.Description is not null);
    }
}

public class SaveSubGraphValidator : AbstractValidator<SaveSubGraphDto>
{
    public SaveSubGraphValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("SubGraph name is required.")
            .MaximumLength(200).WithMessage("SubGraph name must not exceed 200 characters.");

        RuleFor(x => x.GraphJson)
            .NotEmpty().WithMessage("Graph JSON is required.");
    }
}
