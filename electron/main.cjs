const { app, BrowserWindow, shell, Menu, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");

const isDev = !app.isPackaged && process.env.ELECTRON_DEV === "1";
const devUrl = process.env.ELECTRON_DEV_URL || "http://localhost:8080";

let localServer = null;

async function startLocalServer() {
  if (isDev) {
    console.log("[Meeple Vault] Using Vite dev server:", devUrl);
    return devUrl;
  }

  return new Promise((resolve) => {
    const distPath = path.join(__dirname, "..", "dist");
    const indexHtml = fs.readFileSync(path.join(distPath, "index.html"), "utf-8");

    const server = http.createServer((req, res) => {
      let urlPath = req.url === "/" ? "/index.html" : req.url;
      let filePath = path.join(distPath, urlPath);

      const ext = path.extname(filePath);
      const contentTypes = {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".woff": "font/woff",
        ".woff2": "font/woff2",
      };

      const contentType = contentTypes[ext] || "application/octet-stream";

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(indexHtml);
        } else {
          res.writeHead(200, { "Content-Type": contentType });
          res.end(data);
        }
      });
    });

    server.listen(3847, (err) => {
      if (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
      }
      localServer = server;
      const url = "http://localhost:3847";
      console.log(`[Meeple Vault] Local server: ${url}`);
      resolve(url);
    });
  });
}

let localServerUrl = null;

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
      sandbox: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  if (isDev) {
    win.loadURL(devUrl);
    if (process.env.ELECTRON_DEV === "1") {
      win.webContents.openDevTools({ mode: "detach" });
    }
  } else if (localServerUrl) {
    win.loadURL(localServerUrl);
  } else {
    win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(
      `<!doctype html><html><body style="font-family:system-ui;padding:2rem;background:#1a120b;color:#f3e6cf">
        <h1>Meeple Vault</h1>
        <p>Starting local server...</p>
      </body></html>`
    ));
  }
}

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

app.whenReady().then(async () => {
  const serverUrl = await startLocalServer();
  localServerUrl = serverUrl;
  createWindow();
});

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
  if (localServer) {
    localServer.close();
  }
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});