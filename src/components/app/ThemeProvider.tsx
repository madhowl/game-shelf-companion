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
      <DropdownMenuContent align="end" className="w-72">
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
        <div className="grid grid-cols-3 gap-2 px-2 pb-2 pt-1">
          {SKINS.map((s) => {
            const active = skin === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSkin(s.id)}
                title={s.description}
                className={[
                  "group flex flex-col items-stretch gap-1 rounded-md border p-1.5 text-left transition-colors",
                  active
                    ? "border-accent ring-2 ring-accent/40 bg-accent/10"
                    : "border-border hover:bg-muted",
                ].join(" ")}
              >
                <SkinThumbnail skin={s.id} />
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[11px] font-medium truncate">{s.label}</span>
                  {active && <Check className="h-3 w-3 text-accent" />}
                </div>
              </button>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SkinThumbnail({ skin }: { skin: "cabinet" | "workbench" | "command" }) {
  // Mini visual schematic of each layout. Uses theme tokens so it adapts.
  const base = "w-full aspect-[4/3] rounded-sm overflow-hidden bg-background border border-border/60 flex";
  if (skin === "cabinet") {
    return (
      <div className={base}>
        <div className="w-1/3 bg-card border-r border-border/60 flex flex-col gap-1 p-1">
          <div className="h-1.5 rounded-sm bg-accent/60" />
          <div className="h-1 rounded-sm bg-muted-foreground/30" />
          <div className="h-1 rounded-sm bg-muted-foreground/30" />
          <div className="h-1 rounded-sm bg-muted-foreground/20" />
        </div>
        <div className="flex-1 p-1 flex flex-col gap-1">
          <div className="h-1.5 w-2/3 rounded-sm bg-foreground/40" />
          <div className="flex-1 rounded-sm bg-muted/60" />
        </div>
      </div>
    );
  }
  if (skin === "workbench") {
    return (
      <div className={`${base} flex-col`}>
        <div className="h-3 wood-surface flex items-center gap-1 px-1">
          <div className="h-1 w-3 rounded-sm bg-background/40" />
          <div className="h-1 w-3 rounded-sm bg-background/40" />
          <div className="h-1 w-3 rounded-sm bg-accent/70" />
        </div>
        <div className="flex-1 p-1 flex flex-col gap-1">
          <div className="h-1.5 w-1/2 rounded-sm bg-foreground/40" />
          <div className="flex-1 rounded-sm bg-muted/60" />
        </div>
      </div>
    );
  }
  return (
    <div className={base}>
      <div className="w-2 bg-card border-r border-border/60 flex flex-col items-center gap-1 py-1">
        <div className="h-1 w-1 rounded-full bg-accent" />
        <div className="h-1 w-1 rounded-full bg-muted-foreground/50" />
        <div className="h-1 w-1 rounded-full bg-muted-foreground/50" />
      </div>
      <div className="flex-1 p-1 flex flex-col gap-1">
        <div className="h-1 w-1/3 rounded-sm bg-foreground/30" />
        <div className="h-1 w-2/3 rounded-sm bg-muted-foreground/30" />
        <div className="flex-1 rounded-sm bg-muted/40" />
      </div>
    </div>
  );
}
