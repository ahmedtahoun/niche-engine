#!/usr/bin/env bash
# Builds the server and publishes it to the `deploy` branch: the same steps as
# .github/workflows/deploy.yml, for when GitHub Actions is slow or unavailable.
# Usage: npm run publish:deploy   (from a clean, committed main)
set -euo pipefail
cd "$(dirname "$0")/.."

[ -z "$(git status --porcelain)" ] || { echo "Commit your changes first."; exit 1; }
SHA=$(git rev-parse HEAD)
REMOTE=$(git remote get-url origin)

npm test
npm run check:niches
NEXT_TELEMETRY_DISABLED=1 npm run build --workspace @niche-engine/web

rm -rf bundle && mkdir bundle
cp -R apps/web/.next/standalone/. bundle/
# Image resizing is not used; the sharp binaries are built for this computer, not the server.
rm -rf bundle/node_modules/sharp bundle/node_modules/@img
mkdir -p bundle/apps/web/.next
cp -R apps/web/.next/static bundle/apps/web/.next/static
# Logo, icons, share card and product photos (standalone builds leave public/ out).
[ -d apps/web/public ] && cp -R apps/web/public bundle/apps/web/public
cp -R niches bundle/niches
cp deploy/cpanel/.cpanel.yml bundle/.cpanel.yml
cp deploy/cpanel/README.md bundle/README.md
echo "$SHA" > bundle/REVISION
# The deploy branch is public: refuse to publish private business files (supplier costs, margins).
if find bundle -name '*.local.*' -o -path '*/private/*' | grep -q .; then
  echo "Private files found in the bundle; not publishing:" >&2
  find bundle -name '*.local.*' -o -path '*/private/*' >&2
  exit 1
fi

rm -rf out
git clone --quiet --depth 1 --branch deploy "$REMOTE" out
rsync -a --delete --exclude .git bundle/ out/
cd out
git add -A
if git diff --cached --quiet; then echo "No changes to publish"; exit 0; fi
git commit --quiet -m "Build ${SHA:0:7} (published locally): $(git -C .. log -1 --format=%s)"
git push --quiet origin deploy
echo "Published ${SHA:0:7} to the deploy branch"
