import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { BUILTIN_LANGUAGES, en, type Dict } from "./translations";

const LANG_KEY = "meeple-vault-lang";
const CUSTOM_KEY = "meeple-vault-custom-langs";

export type LangMeta = { code: string; name: string; builtin: boolean };

type CustomLang = { code: string; name: string; dict: Dict };

type Ctx = {
  lang: string;
  setLang: (code: string) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  languages: LangMeta[];
  importLanguage: (file: File) => Promise<{ code: string; name: string }>;
  exportLanguage: (code: string) => void;
  deleteCustomLanguage: (code: string) => void;
  currentDict: Dict;
};

const I18nCtx = createContext<Ctx | null>(null);

function readCustom(): CustomLang[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((l) => l && typeof l.code === "string" && typeof l.name === "string" && l.dict);
  } catch {
    return [];
  }
}

function readLang(): string {
  if (typeof window === "undefined") return "en";
  return localStorage.getItem(LANG_KEY) || (navigator.language?.slice(0, 2) ?? "en");
}

function interpolate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<string>("en");
  const [custom, setCustom] = useState<CustomLang[]>([]);

  useEffect(() => {
    setCustom(readCustom());
    const initial = readLang();
    setLangState(initial);
  }, []);

  // Validate persisted lang exists; fall back to en
  useEffect(() => {
    const all = [...BUILTIN_LANGUAGES.map((b) => b.code), ...custom.map((c) => c.code)];
    if (!all.includes(lang)) setLangState("en");
  }, [custom, lang]);

  const setLang = useCallback((code: string) => {
    setLangState(code);
    try { localStorage.setItem(LANG_KEY, code); } catch {}
  }, []);

  const currentDict = useMemo<Dict>(() => {
    const b = BUILTIN_LANGUAGES.find((l) => l.code === lang);
    if (b) return b.dict;
    const c = custom.find((l) => l.code === lang);
    return c?.dict ?? en;
  }, [lang, custom]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const v = currentDict[key] ?? en[key] ?? key;
      return interpolate(v, vars);
    },
    [currentDict],
  );

  const languages = useMemo<LangMeta[]>(
    () => [
      ...BUILTIN_LANGUAGES.map((l) => ({ code: l.code, name: l.name, builtin: true })),
      ...custom.map((l) => ({ code: l.code, name: l.name, builtin: false })),
    ],
    [custom],
  );

  const persistCustom = (next: CustomLang[]) => {
    setCustom(next);
    try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(next)); } catch {}
  };

  const importLanguage = useCallback(
    async (file: File) => {
      const text = await file.text();
      const obj = JSON.parse(text);
      if (!obj || typeof obj !== "object" || !obj.code || !obj.name || !obj.dict || typeof obj.dict !== "object") {
        throw new Error("Invalid translation file");
      }
      const code = String(obj.code).slice(0, 16);
      const name = String(obj.name).slice(0, 64);
      const dict: Dict = {};
      for (const [k, v] of Object.entries(obj.dict)) {
        if (typeof v === "string") dict[k] = v;
      }
      const existing = custom.filter((l) => l.code !== code);
      const next = [...existing, { code, name, dict }];
      persistCustom(next);
      setLang(code);
      return { code, name };
    },
    [custom, setLang],
  );

  const exportLanguage = useCallback(
    (code: string) => {
      const builtin = BUILTIN_LANGUAGES.find((l) => l.code === code);
      const found = builtin ?? custom.find((l) => l.code === code);
      if (!found) return;
      // Export merged with English keys so translators have all keys to fill in.
      const dict: Dict = { ...en, ...found.dict };
      const payload = { code: found.code, name: found.name, dict };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meeple-vault-translation-${found.code}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    [custom],
  );

  const deleteCustomLanguage = useCallback(
    (code: string) => {
      const next = custom.filter((l) => l.code !== code);
      persistCustom(next);
      if (lang === code) setLang("en");
    },
    [custom, lang, setLang],
  );

  const value: Ctx = {
    lang,
    setLang,
    t,
    languages,
    importLanguage,
    exportLanguage,
    deleteCustomLanguage,
    currentDict,
  };

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function useT() {
  return useI18n().t;
}