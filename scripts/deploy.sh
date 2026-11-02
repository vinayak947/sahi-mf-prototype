#!/usr/bin/env bash
# Builds the prototype and publishes dist/ to the gh-pages branch (GitHub Pages).
set -euo pipefail

cd "$(dirname "$0")/.."
remote=$(git remote get-url origin)
repo=$(basename "$remote" .git)

rm -rf dist
FIGMA_PUBLIC_URL="/$repo" npx vite build
touch dist/.nojekyll

cd dist
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C .. config user.name)" -c user.email="$(git -C .. config user.email)" \
  commit -q -m "Deploy $(git -C .. rev-parse --short HEAD)"
git push -q -f "$remote" gh-pages
rm -rf .git

echo "Deployed. Live in about a minute at: https://$(gh api user --jq .login 2>/dev/null || echo '<user>').github.io/$repo/"
