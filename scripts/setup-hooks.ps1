# setup-hooks.ps1
# Run this once after cloning to wire up the shared git hooks and install
# all pre-commit / dev dependencies.
#
# Usage:
#   .\scripts\setup-hooks.ps1              # uses the active venv / system Python
#   .\scripts\setup-hooks.ps1 -PythonExe "C:\Python311\python.exe"

param(
    [string]$PythonExe = "python"
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$msg) {
    Write-Host "`n>> $msg" -ForegroundColor Cyan
}

# ── 0. Always run from the repo root ─────────────────────────────────────
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

# ── 1. Point git at the tracked hooks directory ───────────────────────────
Write-Step "Configuring git hooks path → .githooks"
git config core.hooksPath .githooks
Write-Host "   core.hooksPath = .githooks" -ForegroundColor Green

# ── 2. Install Python dev dependencies ────────────────────────────────────
Write-Step "Installing dev dependencies"
& $PythonExe -m pip install --upgrade pip | Out-Null
& $PythonExe -m pip install `
    black `
    isort `
    flake8 `
    mypy `
    bandit `
    ruff `
    pyupgrade `
    torchfix `
    nbstripout `
    detect-secrets `
    pre-commit `
    pytest `
    pytest-cov

# ── 3. Install pre-commit hooks ───────────────────────────────────────────
Write-Step "Installing pre-commit hooks"
& $PythonExe -m pre_commit install --install-hooks
& $PythonExe -m pre_commit install --hook-type post-commit

# ── 4. Initialise detect-secrets baseline (if not present) ────────────────
if (-not (Test-Path ".secrets.baseline")) {
    Write-Step "Creating detect-secrets baseline"
    & $PythonExe -m detect_secrets scan > .secrets.baseline
    Write-Host "   .secrets.baseline created" -ForegroundColor Green
}

Write-Host "`nAll done! Git hooks are active." -ForegroundColor Green
Write-Host "  pre-commit  → format + lint + type-check + security scan"
Write-Host "  post-commit → auto-reformat and amend if black/isort changed anything"
