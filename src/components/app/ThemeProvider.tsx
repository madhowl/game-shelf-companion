import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Palette, Sun, Layout as LayoutIcon, Languages, Download, Upload, Trash2 } from "lucide-react";
import { useSkin, SKINS } from "@/components/app/SkinProvider";
import { useI18n } from "@/lib/i18n/I18nProvider";
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

const VARIANT_IDS: ThemeVariant[] = ["tabletop", "modern", "neon"];
const MODE_LIST: { id: ThemeMode; icon: typeof Sun }[] = [
  { id: "light", icon: Sun },
  { id: "dark", icon: Moon },
  { id: "system", icon: Monitor },
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
  const { t, lang, setLang, languages, importLanguage, exportLanguage, deleteCustomLanguage } = useI18n();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [importMsg, setImportMsg] = useState<string>("");
  const Icon = resolvedMode === "dark" ? Moon : Sun;

  const onImportFile = async (file: File | null) => {
    if (!file) return;
    setImportMsg("");
    try {
      const r = await importLanguage(file);
      setImportMsg(t("language.imported", { name: r.name }));
    } catch {
      setImportMsg(t("language.importError"));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("theme.settings")}
        title={t("theme.settings")}
        className={
          "inline-flex items-center justify-center h-9 w-9 rounded-md border border-border bg-card/60 text-foreground hover:bg-muted transition-colors " +
          (className ?? "")
        }
      >
        <Icon className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Palette className="h-3.5 w-3.5" /> {t("theme.appearance")}
        </DropdownMenuLabel>
        {MODE_LIST.map((m) => {
          const MIcon = m.icon;
          const active = mode === m.id;
          return (
            <DropdownMenuItem key={m.id} onClick={() => setMode(m.id)}>
              <MIcon className="h-4 w-4 mr-2" />
              <span className="flex-1">{t(`mode.${m.id}`)}</span>
              {active && <Check className="h-3.5 w-3.5 opacity-70" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("theme.style")}</DropdownMenuLabel>
        {VARIANT_IDS.map((v) => {
          const active = variant === v;
          return (
            <DropdownMenuItem
              key={v}
              onClick={() => setVariant(v)}
              className="flex-col items-start gap-0.5"
            >
              <div className="flex w-full items-center">
                <span className="flex-1 font-medium">{t(`variant.${v}`)}</span>
                {active && <Check className="h-3.5 w-3.5 opacity-70" />}
              </div>
              <span className="text-[11px] text-muted-foreground">{t(`variant.${v}.desc`)}</span>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2">
          <LayoutIcon className="h-3.5 w-3.5" /> {t("theme.layout")}
        </DropdownMenuLabel>
        <div className="grid grid-cols-3 gap-2 px-2 pb-2 pt-1">
          {SKINS.map((s) => {
            const active = skin === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSkin(s.id)}
                title={t(`skin.${s.id}.desc`)}
                className={[
                  "group flex flex-col items-stretch gap-1 rounded-md border p-1.5 text-left transition-colors",
                  active
                    ? "border-accent ring-2 ring-accent/40 bg-accent/10"
                    : "border-border hover:bg-muted",
                ].join(" ")}
              >
                <SkinThumbnail skin={s.id} />
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[11px] font-medium truncate">{t(`skin.${s.id}`)}</span>
                  {active && <Check className="h-3 w-3 text-accent" />}
                </div>
              </button>
            );
          })}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2">
          <Languages className="h-3.5 w-3.5" /> {t("theme.language")}
        </DropdownMenuLabel>
        {languages.map((l) => {
          const active = lang === l.code;
          return (
            <DropdownMenuItem
              key={l.code}
              onSelect={(e) => { e.preventDefault(); setLang(l.code); }}
              className="flex items-center gap-2"
            >
              <span className="flex-1 truncate">
                {l.name}
                <span className="ml-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  {l.builtin ? t("language.builtin") : t("language.custom")}
                </span>
              </span>
              {active && <Check className="h-3.5 w-3.5 opacity-70" />}
              {!l.builtin && (
                <button
                  type="button"
                  title={t("language.delete")}
                  onClick={(e) => { e.stopPropagation(); deleteCustomLanguage(l.code); }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); fileRef.current?.click(); }}>
          <Upload className="h-3.5 w-3.5 mr-2" /> {t("language.import")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); exportLanguage(lang); }}>
          <Download className="h-3.5 w-3.5 mr-2" /> {t("language.export")}
        </DropdownMenuItem>
        {importMsg && (
          <div className="px-2 pt-1 pb-2 text-[11px] text-muted-foreground">{importMsg}</div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => { onImportFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
        />
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
