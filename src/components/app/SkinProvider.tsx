import { createContext, useContext, useEffect, useState } from "react";

export type Skin = "cabinet" | "workbench" | "command";

const SKIN_KEY = "meeple-vault-skin";

export const SKINS: { id: Skin; label: string; description: string }[] = [
  { id: "cabinet", label: "Cabinet", description: "Classic sidebar — full nav rail" },
  { id: "workbench", label: "Workbench", description: "Top toolbar with tabbed nav" },
  { id: "command", label: "Command", description: "Minimal icon rail, focus on content" },
];

type Ctx = { skin: Skin; setSkin: (s: Skin) => void };
const SkinCtx = createContext<Ctx | null>(null);

function readSkin(): Skin {
  if (typeof window === "undefined") return "cabinet";
  const v = localStorage.getItem(SKIN_KEY);
  if (v === "cabinet" || v === "workbench" || v === "command") return v;
  return "cabinet";
}

export function SkinProvider({ children }: { children: React.ReactNode }) {
  const [skin, setSkinState] = useState<Skin>("cabinet");

  useEffect(() => setSkinState(readSkin()), []);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("skin-cabinet", "skin-workbench", "skin-command");
    root.classList.add(`skin-${skin}`);
    try { localStorage.setItem(SKIN_KEY, skin); } catch {}
  }, [skin]);

  return <SkinCtx.Provider value={{ skin, setSkin: setSkinState }}>{children}</SkinCtx.Provider>;
}

export function useSkin() {
  const ctx = useContext(SkinCtx);
  if (!ctx) throw new Error("useSkin must be used within SkinProvider");
  return ctx;
}