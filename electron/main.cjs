const { app, BrowserWindow, shell, Menu, ipcMain, dialog } = require("electron");
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

// ---------------------------------------------------------------------------
// IPC: native image picker for OCR
// ---------------------------------------------------------------------------
const IMAGE_MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
};

ipcMain.handle("meeple:open-image", async (event, opts = {}) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    title: opts.title || "Select card image for OCR",
    buttonLabel: opts.buttonLabel || "Use for OCR",
    properties: ["openFile"],
    filters: [
      { name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp", "tif", "tiff"] },
      { name: "All files", extensions: ["*"] },
    ],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const filePath = result.filePaths[0];
  try {
    const buf = await fs.promises.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = IMAGE_MIME[ext] || "application/octet-stream";
    const dataUrl = `data:${mimeType};base64,${buf.toString("base64")}`;
    return {
      name: path.basename(filePath),
      path: filePath,
      mimeType,
      dataUrl,
      size: buf.byteLength,
    };
  } catch (err) {
    return { error: err && err.message ? err.message : String(err) };
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});