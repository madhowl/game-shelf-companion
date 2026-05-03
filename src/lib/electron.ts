// Typed wrapper around the Electron preload bridge.
// Falls back gracefully when running in a regular browser.

export interface PickedImage {
  name: string;
  path: string;
  mimeType: string;
  dataUrl: string;
  size: number;
}

interface MeepleBridge {
  isElectron: true;
  platform: NodeJS.Platform;
  openImageDialog: (opts?: {
    title?: string;
    buttonLabel?: string;
  }) => Promise<PickedImage | { error: string } | null>;
}

declare global {
  interface Window {
    meepleVault?: MeepleBridge;
  }
}

export function isElectron(): boolean {
  return typeof window !== "undefined" && !!window.meepleVault?.isElectron;
}

export async function pickImageNative(opts?: {
  title?: string;
  buttonLabel?: string;
}): Promise<PickedImage | null> {
  if (!isElectron()) return null;
  const result = await window.meepleVault!.openImageDialog(opts);
  if (!result) return null;
  if ("error" in result) throw new Error(result.error);
  return result;
}