#!/usr/bin/env bash
# Ploi deploy script for the admin panel site. Call it from the site's deploy script:
#
#   cd {SITE_DIRECTORY}
#   git pull origin {BRANCH}
#   bash scripts/ploi/deploy.sh
#
# Builds the panel into dist/, which nginx serves (scripts/ploi/nginx.conf). The panel calls the
# API on its own origin (/api), which that nginx config proxies to Turbo, so nothing here needs
# to know where Turbo is.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

# Ploi runs deploy scripts with a minimal PATH; Node is usually installed through nvm or the
# system package.
if ! command -v node >/dev/null 2>&1 && [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh"
fi

command -v node >/dev/null 2>&1 || {
  echo "ERROR: Node.js was not found. Install Node 22 or newer (Ploi > Server > Manage > Node.js)." >&2
  exit 1
}

echo "==> Using Node $(node --version)"

# The Yarn version pinned in package.json, through Corepack, which ships with Node.
corepack enable --install-directory "$HOME/.local/bin" >/dev/null 2>&1 || corepack enable
export PATH="$HOME/.local/bin:$PATH"

echo "==> Installing dependencies"
yarn install --immutable

echo "==> Building"
yarn build

echo "==> Built $(du -sh dist | cut -f1) into dist/"
