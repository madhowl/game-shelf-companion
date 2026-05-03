// Intentionally minimal — Meeple Vault is fully client-side (IndexedDB, jsPDF).
// Add safe contextBridge APIs here later if you need OS integration
// (e.g., file dialogs for OCR import or PDF save).
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("meepleVault", {
  isElectron: true,
  platform: process.platform,
});