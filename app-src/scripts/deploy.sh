#!/usr/bin/env bash
# Deploy the web build to GitHub Pages (release-manager or mobile-lead only).
# Target: https://connorluciani.github.io/woodstock/ served from /docs on main of the Pages repo.
# Usage: scripts/deploy.sh "Stage N: what changed"     (PAGES_REPO defaults to ../woodstock)
# Steps: gate must already have passed (npm run gate); copy dist/ to docs/, copy the source to
# app-src/ (tracked files only, no node_modules), commit, fetch and rebase on origin/main, push.
# Never force-push.
set -euo pipefail
cd "$(dirname "$0")/.."
APP="$(pwd)"
PAGES="${PAGES_REPO:-$APP/../woodstock}"
MSG="${1:-Web build}"
[ -f dist/index.html ] || { echo "no dist/: run npm run build:web first"; exit 1; }
[ -f dist/.nojekyll ] || touch dist/.nojekyll
cd "$PAGES"
git fetch origin +refs/heads/main:refs/remotes/origin/main
git checkout -q main
git rebase -q origin/main
rm -rf docs app-src
mkdir -p docs app-src
cp -R "$APP/dist/." docs/
touch docs/.nojekyll
( cd "$APP" && git ls-files -z --cached --others --exclude-standard ) | ( cd "$APP" && xargs -0 tar cf - ) | ( cd app-src && tar xf - )
git add -A docs app-src
if git diff --cached --quiet; then echo "nothing to deploy"; exit 0; fi
git commit -q -m "$MSG

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01CT7ga6ET8QSZyYKrjxzaYQ"
git fetch origin +refs/heads/main:refs/remotes/origin/main
git rebase -q origin/main
git push origin main
echo "deployed: https://connorluciani.github.io/woodstock/ ($(git rev-parse --short HEAD))"
