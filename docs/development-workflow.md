# Development Workflow

Since we have moved away from local Git hooks and transitioned to GitHub Actions for Continuous Integration (CI), all formatting, linting, type-checking, and testing are strictly enforced on Pull Requests and commits to `main`. 

To avoid failing CI builds on GitHub and keep the commit history clean, it is highly recommended to run the CI checks locally before you create a commit.

## Pre-Commit Checklist

Before committing your changes, verify that your code passes the linters, type checkers, and test suites by running the following command from the root of the project:

```bash
cd engine
uv run ruff check --fix .
uv run ty check .
uv run pytest
```

### What these checks do:

1. **`ruff check .`**: Extremely fast Python linter and formatter. This will catch unused imports, invalid syntax, and stylistic issues. 
   *(Tip: you can run `uv run ruff check --fix .` to automatically fix many common linting errors).*
2. **`mypy .`**: Static type checker. Ensures that all typehints are correct and there are no type-mismatches across function calls.
3. **`pytest`**: Our testing framework. This will run the full suite of unit tests located in the `tests/` directory to ensure no existing functionality was broken by your changes.

If all of these commands pass without errors, your code is ready to be committed and pushed!