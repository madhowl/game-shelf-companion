const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

const isDev = !app.isPackaged && process.env.ELECTRON_DEV === "1";
const devUrl = process.env.ELECTRON_DEV_URL || "http://localhost:3000";

function resolveIndexHtml() {
  // Look for a built static SPA. We try a few likely locations.
  const candidates = [
    path.join(__dirname, "..", "dist", "client", "index.html"),
    path.join(__dirname, "..", "dist", "index.html"),
    path.join(__dirname, "..", ".output", "public", "index.html"),
    path.join(process.resourcesPath || "", "app", "dist", "client", "index.html"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  return null;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: "#1a120b",
    title: "Meeple Vault",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  // Open external links in the user's default browser, not inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  if (isDev) {
    win.loadURL(devUrl);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexPath = resolveIndexHtml();
    if (indexPath) {
      win.loadFile(indexPath);
    } else {
      win.loadURL(
        "data:text/html;charset=utf-8," +
          encodeURIComponent(
            `<!doctype html><html><body style="font-family:system-ui;padding:2rem;background:#1a120b;color:#f3e6cf">
              <h1>Meeple Vault</h1>
              <p>No built UI found. Run <code>npm run electron:build:web</code> first to produce <code>dist/client/index.html</code>.</p>
            </body></html>`
          )
      );
    }
  }
}

// Minimal application menu (mostly relies on autoHideMenuBar).
Menu.setApplicationMenu(
  Menu.buildFromTemplate([
    {
      label: "Meeple Vault",
      submenu: [
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
  ])
);

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});