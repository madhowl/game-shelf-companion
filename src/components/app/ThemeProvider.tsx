import { createContext, useContext, useEffect, useState } from "react";
import { Check, Monitor, Moon, Palette, Sun, Layout as LayoutIcon } from "lucide-react";
import { useSkin, SKINS } from "@/components/app/SkinProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ThemeMode = "light" | "dark" | "system";
export type ThemeVariant = "tabletop" | "modern" | "neon";

type Ctx = {
  mode: ThemeMode;
  variant: ThemeVariant;
  resolvedMode: "light" | "dark";
  setMode: (m: ThemeMode) => void;
  setVariant: (v: ThemeVariant) => void;
};

const ThemeContext = createContext<Ctx | null>(null);
const MODE_KEY = "meeple-vault-theme";        // kept for backwards-compat
const VARIANT_KEY = "meeple-vault-variant";

const VARIANTS: { id: ThemeVariant; label: string; description: string }[] = [
  { id: "tabletop", label: "Tabletop", description: "Warm wood & felt (default)" },
  { id: "modern", label: "Modern", description: "Clean & minimal indigo" },
  { id: "neon", label: "Neon", description: "Cyberpunk magenta & cyan" },
];

const MODES: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

function readMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const v = localStorage.getItem(MODE_KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}
function readVariant(): ThemeVariant {
  if (typeof window === "undefined") return "tabletop";
  const v = localStorage.getItem(VARIANT_KEY);
  if (v === "tabletop" || v === "modern" || v === "neon") return v;
  return "tabletop";
}
function systemPrefersDark(): boolean {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [variant, setVariantState] = useState<ThemeVariant>("tabletop");
  const [resolvedMode, setResolved] = useState<"light" | "dark">("light");

  // Hydrate from storage on mount
  useEffect(() => {
    setModeState(readMode());
    setVariantState(readVariant());
  }, []);

  // Resolve mode (track system changes when mode === system)
  useEffect(() => {
    const apply = () => {
      const r = mode === "system" ? (systemPrefersDark() ? "dark" : "light") : mode;
      setResolved(r);
    };
    apply();
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [mode]);

  // Apply classes & persist
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedMode === "dark");
    root.style.colorScheme = resolvedMode;
    root.classList.remove("theme-tabletop", "theme-modern", "theme-neon");
    root.classList.add(`theme-${variant}`);
    try {
      localStorage.setItem(MODE_KEY, mode);
      localStorage.setItem(VARIANT_KEY, variant);
    } catch {}
  }, [resolvedMode, variant, mode]);

  const value: Ctx = {
    mode,
    variant,
    resolvedMode,
    setMode: setModeState,
    setVariant: setVariantState,
  };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function ThemeToggle({ className }: { className?: string }) {
  const { mode, variant, resolvedMode, setMode, setVariant } = useTheme();
  const { skin, setSkin } = useSkin();
  const Icon = resolvedMode === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Theme settings"
        title="Theme settings"
        className={
          "inline-flex items-center justify-center h-9 w-9 rounded-md border border-border bg-card/60 text-foreground hover:bg-muted transition-colors " +
          (className ?? "")
        }
      >
        <Icon className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Palette className="h-3.5 w-3.5" /> Appearance
        </DropdownMenuLabel>
        {MODES.map((m) => {
          const MIcon = m.icon;
          const active = mode === m.id;
          return (
            <DropdownMenuItem key={m.id} onClick={() => setMode(m.id)}>
              <MIcon className="h-4 w-4 mr-2" />
              <span className="flex-1">{m.label}</span>
              {active && <Check className="h-3.5 w-3.5 opacity-70" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Style</DropdownMenuLabel>
        {VARIANTS.map((v) => {
          const active = variant === v.id;
          return (
            <DropdownMenuItem
              key={v.id}
              onClick={() => setVariant(v.id)}
              className="flex-col items-start gap-0.5"
            >
              <div className="flex w-full items-center">
                <span className="flex-1 font-medium">{v.label}</span>
                {active && <Check className="h-3.5 w-3.5 opacity-70" />}
              </div>
              <span className="text-[11px] text-muted-foreground">{v.description}</span>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2">
          <LayoutIcon className="h-3.5 w-3.5" /> Layout
        </DropdownMenuLabel>
        {SKINS.map((s) => {
          const active = skin === s.id;
          return (
            <DropdownMenuItem
              key={s.id}
              onClick={() => setSkin(s.id)}
              className="flex-col items-start gap-0.5"
            >
              <div className="flex w-full items-center">
                <span className="flex-1 font-medium">{s.label}</span>
                {active && <Check className="h-3.5 w-3.5 opacity-70" />}
              </div>
              <span className="text-[11px] text-muted-foreground">{s.description}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
