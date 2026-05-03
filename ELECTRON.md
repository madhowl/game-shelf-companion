# Packaging Meeple Vault as a Desktop App

Meeple Vault ships with an Electron shell and `electron-builder` config so you
can produce native installers for **Windows, macOS, and Linux** from one codebase.

## 1. Install the desktop tooling (one-time)

These deps are kept out of the default `package.json` so the web build stays lean.
Run this once on the machine where you'll build the desktop app:

```bash
npm install --save-dev electron electron-builder
```

Then add (or merge) these scripts into `package.json`:

```json
{
  "main": "electron/main.cjs",
  "scripts": {
    "electron:dev":   "ELECTRON_DEV=1 electron electron/main.cjs",
    "electron:build": "vite build",
    "dist:win":   "bash scripts/build-electron.sh win",
    "dist:mac":   "bash scripts/build-electron.sh mac",
    "dist:linux": "bash scripts/build-electron.sh linux",
    "dist:all":   "bash scripts/build-electron.sh all"
  }
}
```

On Windows PowerShell use `scripts/build-electron.ps1` instead.

## 2. Run the desktop app in dev

In one terminal:

```bash
npm run dev          # starts Vite at http://localhost:3000
```

In another:

```bash
npm run electron:dev # opens the Electron window pointing at the dev server
```

## 3. Build installers

```bash
npm run dist:win     # NSIS .exe installer (x64)
npm run dist:mac     # .dmg + .zip (x64 + arm64) — must run on macOS
npm run dist:linux   # .AppImage + .deb (x64)
npm run dist:all     # all three (mac target only works on a mac host)
```

Output appears in `./electron-release/`.

### Cross-compilation matrix

| Host    | Can build for                  |
|---------|--------------------------------|
| Linux   | Linux ✅, Windows ✅ (needs `wine`), macOS ❌ |
| macOS   | macOS ✅, Linux ✅, Windows ✅ (needs `wine`) |
| Windows | Windows ✅, Linux ⚠️ (use WSL), macOS ❌ |

Apple's signing rules mean you must build (and ideally sign + notarize) the
`.dmg` on a real Mac.

## 4. About the build output

TanStack Start's default `vite build` targets a Cloudflare Worker. The Electron
main process (`electron/main.cjs`) looks for the static client bundle in:

1. `dist/client/index.html`
2. `dist/index.html`
3. `.output/public/index.html`

If none exist after `vite build`, the app shows a helpful message instead of
a white screen. Meeple Vault is fully client-side (Dexie/IndexedDB, jsPDF,
local LM Studio for OCR), so once the static bundle is loaded it works
entirely offline.

If you need a guaranteed static SPA output, set `base: './'` in `vite.config.ts`
via `defineConfig({ vite: { base: './' } })` so asset URLs resolve under
`file://`.

## 5. Code signing (optional, for distribution)

- **Windows:** set `CSC_LINK` + `CSC_KEY_PASSWORD` env vars to your `.pfx`.
- **macOS:** set `CSC_LINK` + `CSC_KEY_PASSWORD`, plus `APPLE_ID` /
  `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID` for notarization.
- **Linux:** AppImage / deb are unsigned by default — fine for personal use.

## 6. Icons

Drop these into `electron/build/` before building:

- `icon.ico` — Windows (256×256 multi-res)
- `icon.icns` — macOS
- `icon.png` — Linux (512×512)