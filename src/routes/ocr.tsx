import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { ScanLine, Loader2, Upload, Settings, CheckCircle2, FolderOpen } from "lucide-react";
import { db, uid, now, type ComponentTemplate } from "@/lib/db";
import { Field, inputCls } from "./index";
import { fileToDataUrl } from "@/lib/utils-format";
import { isElectron, pickImageNative } from "@/lib/electron";
import { useT } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/ocr")({
  component: OcrPage,
});

const LS_KEY = "lmstudio-config";

interface LMConfig {
  baseUrl: string;
  model: string;
}

function loadCfg(): LMConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { baseUrl: "http://localhost:1234/v1", model: "qwen2-vl-7b-instruct" };
}

function OcrPage() {
  const tr = useT();
  const games = useLiveQuery(() => db.games.toArray(), []);
  const templates = useLiveQuery(() => db.templates.toArray(), []);
  const cardTemplates = (templates ?? []).filter((t) => t.kind === "card");

  const [cfg, setCfg] = useState<LMConfig>(loadCfg);
  const [showCfg, setShowCfg] = useState(false);
  const [gameId, setGameId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<Record<string, unknown> | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const electron = isElectron();

  const tpl = cardTemplates.find((t) => t.id === templateId);

  const onImage = async (f: File | null) => {
    if (!f) return;
    setImage(await fileToDataUrl(f));
    setParsed(null);
    setSavedId(null);
  };

  const onPickNative = async () => {
    setError("");
    try {
      const picked = await pickImageNative({
        title: "Select card image for OCR",
        buttonLabel: "Use for OCR",
      });
      if (!picked) return;
      setImage(picked.dataUrl);
      setParsed(null);
      setSavedId(null);
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  };

  const recognize = async () => {
    setError("");
    setSavedId(null);
    if (!image || !tpl) {
      setError(tr("ocr.errPick"));
      return;
    }
    setLoading(true);
    try {
      const fieldSpec = tpl.fields.map((f) => `- ${f.name} (${f.type}${f.options ? `: ${f.options.join("|")}` : ""})`).join("\n");
      const sys = `You are a board-game card OCR assistant. Look at the card image and extract structured data. Return ONLY a JSON object (no markdown) with these keys: "name" (string for the card title) and "values" (object). The "values" object MUST contain a key for each of the following fields, matching their type:\n${fieldSpec || "(no extra fields)"}\nIf a field is unknown, use null.`;
      const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: cfg.model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: sys },
            {
              role: "user",
              content: [
                { type: "text", text: "Extract the card data as JSON." },
                { type: "image_url", image_url: { url: image } },
              ],
            },
          ],
        }),
      });
      if (!res.ok) throw new Error(`LM Studio error ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content ?? "{}";
      const jsonStr = typeof content === "string" ? content : JSON.stringify(content);
      const cleaned = jsonStr.replace(/```json|```/g, "").trim();
      const obj = JSON.parse(cleaned);
      setName(obj.name ?? "");
      setParsed(obj.values ?? {});
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!gameId || !templateId || !name.trim()) {
      setError(tr("ocr.errSave"));
      return;
    }
    const id = uid();
    await db.components.add({
      id,
      gameId,
      templateId,
      name: name.trim(),
      values: parsed ?? {},
      frontImage: image ?? undefined,
      quantity: 1,
      createdAt: now(),
      updatedAt: now(),
    });
    setSavedId(id);
  };

  const saveCfg = () => {
    localStorage.setItem(LS_KEY, JSON.stringify(cfg));
    setShowCfg(false);
  };

  return (
    <div className="px-6 md:px-10 py-6 md:py-8 max-w-6xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">{tr("ocr.heading")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{tr("ocr.sub")}</p>
        </div>
        <button onClick={() => setShowCfg(true)} className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-muted">
          <Settings className="h-4 w-4" /> {tr("ocr.lmstudio")}
        </button>
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5 shadow-[var(--shadow-card)]">
          <Field label={tr("print.game")}>
            <select value={gameId} onChange={(e) => setGameId(e.target.value)} className={inputCls}>
              <option value="">{tr("ocr.selectGame")}</option>
              {(games ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
          <div className="mt-3">
            <Field label={tr("print.cardTemplate")}>
              <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={inputCls}>
                <option value="">{tr("ocr.selectTemplate")}</option>
                {cardTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-3">
            <Field label={tr("ocr.cardImage")}>
              <div className="flex flex-wrap items-center gap-2">
                {electron && (
                  <button
                    type="button"
                    onClick={onPickNative}
                    className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm hover:bg-primary/90"
                  >
                    <FolderOpen className="h-4 w-4" />
                    {tr("ocr.openFile")}
                  </button>
                )}
                <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border border-input px-3 py-2 text-sm hover:bg-muted w-fit">
                  <Upload className="h-4 w-4" />
                  {electron ? tr("ocr.browserUpload") : tr("ocr.uploadImage")}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onImage(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              {electron && (
                <p className="text-[11px] text-muted-foreground mt-1">{tr("ocr.desktopHint")}</p>
              )}
            </Field>
            {image && <img src={image} alt="card" className="mt-3 max-h-72 rounded-md border border-border" />}
          </div>
          <button onClick={recognize} disabled={loading} className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
            {loading ? tr("ocr.recognizing") : tr("ocr.recognize")}
          </button>
          {error && <div className="mt-3 text-xs text-destructive border border-destructive/40 rounded-md p-2 bg-destructive/5">{error}</div>}
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-display text-xl">{tr("ocr.results")}</h2>
          {!parsed && !loading && <p className="text-sm text-muted-foreground mt-2">{tr("ocr.runHint")}</p>}
          {parsed && tpl && (
            <div className="mt-3 space-y-3">
              <Field label={tr("game.field.name")}>
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
              </Field>
              {tpl.fields.map((f) => (
                <Field key={f.id} label={f.name}>
                  <input
                    value={String(parsed[f.name] ?? parsed[f.id] ?? "")}
                    onChange={(e) => setParsed({ ...parsed, [f.name]: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              ))}
              <button onClick={save} className="mt-2 inline-flex items-center gap-2 rounded-md bg-accent text-accent-foreground px-4 py-2 text-sm font-medium hover:opacity-90">
                {tr("ocr.saveToGame")}
              </button>
              {savedId && (
                <div className="mt-2 inline-flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-accent" /> {tr("ocr.saved")}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showCfg && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4" onClick={() => setShowCfg(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-[var(--shadow-deep)]">
            <h2 className="font-display text-2xl mb-4">{tr("ocr.settings")}</h2>
            <Field label={tr("ocr.baseUrl")}><input value={cfg.baseUrl} onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value })} className={inputCls} /></Field>
            <div className="mt-3">
              <Field label={tr("ocr.model")}><input value={cfg.model} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} className={inputCls} /></Field>
            </div>
            <p className="text-xs text-muted-foreground mt-3">{tr("ocr.settingsHint", { url: "http://localhost:1234/v1" })}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowCfg(false)} className="px-4 py-2 text-sm rounded-md border border-input hover:bg-muted">{tr("common.cancel")}</button>
              <button onClick={saveCfg} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90">{tr("common.save")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
