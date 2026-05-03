#!/usr/bin/env bash
# Cross-platform Electron build helper for macOS / Linux hosts.
# Usage:
#   ./scripts/build-electron.sh win
#   ./scripts/build-electron.sh mac
#   ./scripts/build-electron.sh linux
#   ./scripts/build-electron.sh all
set -euo pipefail

TARGET="${1:-current}"

echo "==> Building web bundle (vite build)"
npx vite build

# Sanity check: electron-builder needs a dist/ index file.
if [ ! -f "dist/index.html" ] && [ ! -f "dist/client/index.html" ]; then
  echo "!! No dist/index.html or dist/client/index.html produced."
  echo "   TanStack Start's default build targets a Cloudflare Worker."
  echo "   You may need a static SPA build target. See ELECTRON.md."
fi

case "$TARGET" in
  win)   npx electron-builder --win   --config electron/builder.config.cjs ;;
  mac)   npx electron-builder --mac   --config electron/builder.config.cjs ;;
  linux) npx electron-builder --linux --config electron/builder.config.cjs ;;
  all)   npx electron-builder -mwl    --config electron/builder.config.cjs ;;
  current) npx electron-builder       --config electron/builder.config.cjs ;;
  *) echo "Unknown target: $TARGET (use win|mac|linux|all)"; exit 1 ;;
esac

echo "==> Done. Installers are in ./electron-release"