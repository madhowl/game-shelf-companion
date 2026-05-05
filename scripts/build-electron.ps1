# Cross-platform Electron build helper for Windows PowerShell.
# Usage:
#   .\scripts\build-electron.ps1 win
#   .\scripts\build-electron.ps1 mac    # requires running on macOS
#   .\scripts\build-electron.ps1 linux
#   .\scripts\build-electron.ps1 all
param(
  [Parameter(Position=0)]
  [ValidateSet("win","mac","linux","all","current")]
  [string]$Target = "current"
)

$ErrorActionPreference = "Stop"

Write-Host "==> Building web bundle (vite build)" -ForegroundColor Cyan
npx vite build

Write-Host "==> Generating static HTML for Electron" -ForegroundColor Cyan
node scripts/build-electron-html.mjs

if (-not (Test-Path "dist/index.html") -and -not (Test-Path "dist/client/index.html")) {
  Write-Warning "No dist/index.html produced. See ELECTRON.md."
}

switch ($Target) {
  "win"     { npx electron-builder --win   --config electron/builder.config.cjs }
  "mac"     { npx electron-builder --mac   --config electron/builder.config.cjs }
  "linux"   { npx electron-builder --linux --config electron/builder.config.cjs }
  "all"     { npx electron-builder -mwl    --config electron/builder.config.cjs }
  "current" { npx electron-builder         --config electron/builder.config.cjs }
}

Write-Host "==> Done. Installers are in .\electron-release" -ForegroundColor Green