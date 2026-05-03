// Intentionally minimal — Meeple Vault is fully client-side (IndexedDB, jsPDF).
// Add safe contextBridge APIs here later if you need OS integration
// (e.g., file dialogs for OCR import or PDF save).
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("meepleVault", {
  isElectron: true,
  platform: process.platform,
  /**
   * Open a native file picker for image selection (used by OCR).
   * Returns { name, dataUrl, mimeType, path } for the chosen file, or null if cancelled.
   */
  openImageDialog: (opts) => ipcRenderer.invoke("meeple:open-image", opts ?? {}),
});