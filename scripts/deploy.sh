#!/usr/bin/env bash
# Builds the prototype and publishes it to the gh-pages branch (GitHub Pages).
set -euo pipefail

cd "$(dirname "$0")/.."
remote=$(git remote get-url origin)
repo=$(basename "$remote" .git)
name=$(git config user.name)
email=$(git config user.email)
rev=$(git rev-parse --short HEAD)

# Build outside the project: ~/Documents is synced by iCloud, which leaves
# "file 2.png" conflict copies when dist/ is deleted and rebuilt quickly.
out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT

FIGMA_PUBLIC_URL="/$repo" npx vite build --outDir "$out" --emptyOutDir
touch "$out/.nojekyll"

cd "$out"
git init -q -b gh-pages
# Commit on top of the existing gh-pages so only changed files are uploaded;
# force-pushing the whole build each time is large enough to drop the connection.
if git fetch -q "$remote" gh-pages 2>/dev/null; then
  git reset -q --soft FETCH_HEAD
fi
git add -A
if git rev-parse -q --verify HEAD >/dev/null && git diff --cached --quiet HEAD; then
  echo "Nothing changed since the last deploy."
  exit 0
fi
git -c user.name="$name" -c user.email="$email" commit -q -m "Deploy $rev"
git -c http.postBuffer=524288000 push -q "$remote" gh-pages

echo "Deployed. Live in about a minute at: https://$(gh api user --jq .login 2>/dev/null || echo '<user>').github.io/$repo/"
