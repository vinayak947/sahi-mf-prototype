#!/usr/bin/env bash
# GitHub Pages now builds from main (.github/workflows/deploy.yml): pushing to main deploys.
# This re-runs that workflow for the current main without a new commit.
set -euo pipefail

cd "$(dirname "$0")/.."
gh workflow run deploy.yml --ref main
echo "Deploy started from main. Live in about two minutes at: https://$(gh api user --jq .login 2>/dev/null || echo '<user>').github.io/$(basename "$(git remote get-url origin)" .git)/"
