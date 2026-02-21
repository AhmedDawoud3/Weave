#!/usr/bin/env bash
# setup-hooks.sh
# Run once after cloning (Linux / macOS / WSL / Git Bash).
#
# Usage:
#   bash scripts/setup-hooks.sh

set -euo pipefail

GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
step() { echo -e "\n${CYAN}>> $*${NC}"; }

# ── 0. Always run from the repo root ─────────────────────────────────────
cd "$(dirname "$0")/.."

# ── 1. Point git at the tracked hooks directory ───────────────────────────
step "Configuring git hooks path → .githooks"
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit .githooks/post-commit
echo -e "   ${GREEN}core.hooksPath = .githooks${NC}"

# ── 2. Install Python dev dependencies ────────────────────────────────────
step "Installing dev dependencies"
pip install --upgrade pip -q
pip install -q \
    black \
    isort \
    flake8 \
    mypy \
    bandit \
    ruff \
    pyupgrade \
    torchfix \
    nbstripout \
    detect-secrets \
    pre-commit \
    pytest \
    pytest-cov

# ── 3. Install pre-commit hooks ───────────────────────────────────────────
step "Installing pre-commit hooks"
pre-commit install --install-hooks
pre-commit install --hook-type post-commit

# ── 4. Initialise detect-secrets baseline (if not present) ────────────────
if [[ ! -f .secrets.baseline ]]; then
    step "Creating detect-secrets baseline"
    detect-secrets scan > .secrets.baseline
    echo -e "   ${GREEN}.secrets.baseline created${NC}"
fi

echo -e "\n${GREEN}All done! Git hooks are active.${NC}"
echo "  pre-commit  → format + lint + type-check + security scan"
echo "  post-commit → auto-reformat and amend if black/isort changed anything"
