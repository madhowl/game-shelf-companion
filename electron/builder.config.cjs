/**
 * electron-builder configuration.
 * Produces installers for Windows (NSIS .exe), macOS (.dmg) and Linux (.AppImage + .deb).
 *
 * Run via the npm scripts:
 *   npm run dist:win
 *   npm run dist:mac
 *   npm run dist:linux
 *   npm run dist:all
 *
 * Cross-compiling macOS .dmg requires running the build ON macOS.
 * Windows and Linux can be built from any host (with wine installed for win on linux).
 */
module.exports = {
  appId: "app.meeplevault.desktop",
  productName: "Meeple Vault",
  copyright: "Copyright © Meeple Vault",
  directories: {
    output: "electron-release",
    buildResources: "electron/build",
  },
  files: [
    "electron/**/*",
    "dist/**/*",
    "package.json",
    "!**/*.map",
    "!node_modules/**/*",
  ],
  extraMetadata: {
    main: "electron/main.cjs",
  },
  asar: true,
  icon: "electron/build/icon",
  win: {
    target: [{ target: "nsis", arch: ["x64"] }],
    artifactName: "MeepleVault-Setup-${version}-${arch}.${ext}",
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "Meeple Vault",
  },
  mac: {
    category: "public.app-category.utilities",
    target: [
      { target: "dmg", arch: ["x64", "arm64"] },
      { target: "zip", arch: ["x64", "arm64"] },
    ],
    artifactName: "MeepleVault-${version}-${arch}.${ext}",
    hardenedRuntime: false,
    icon: "electron/build/icon.icns",
  },
  dmg: {
    title: "Meeple Vault ${version}",
  },
  linux: {
    target: [
      { target: "AppImage", arch: ["x64"] },
      { target: "deb", arch: ["x64"] },
    ],
    category: "Utility",
    artifactName: "MeepleVault-${version}-${arch}.${ext}",
    synopsis: "Board game collection manager",
    icon: "electron/build/icon.png",
  },
};