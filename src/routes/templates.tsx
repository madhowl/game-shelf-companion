import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Plus, Trash2, Settings2, Layers } from "lucide-react";
import { db, uid, now, type ComponentTemplate, type FieldType, type ComponentKind, type TemplateField } from "@/lib/db";
import { Field, inputCls } from "./index";
import { useT } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/templates")({
  component: TemplatesPage,
});

const KINDS: ComponentKind[] = ["card", "chip", "board", "dice", "token", "rules", "miniature", "other"];
const TYPES: FieldType[] = ["string", "longtext", "number", "boolean", "image", "select"];

function TemplatesPage() {
  const tr = useT();
  const templates = useLiveQuery(() => db.templates.toArray(), []);
  const [editing, setEditing] = useState<ComponentTemplate | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="px-6 md:px-10 py-6 md:py-8 max-w-6xl">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">{tr("tpl.heading")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{tr("tpl.sub")}</p>
        </div>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 shadow-[var(--shadow-card)]">
          <Plus className="h-4 w-4" /> {tr("tpl.new")}
        </button>
      </div>

      {(templates?.length ?? 0) === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center bg-card/40">
          <Layers className="h-10 w-10 mx-auto text-muted-foreground" />
          <h3 className="font-display text-2xl mt-4">{tr("tpl.empty.title")}</h3>
          <p className="text-sm text-muted-foreground mt-1">{tr("tpl.empty.body")}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {templates!.map((t) => (
            <button key={t.id} onClick={() => setEditing(t)} className="text-left bg-card border border-border rounded-xl p-5 hover:border-accent transition-colors shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.kind}</div>
                  <div className="font-display text-2xl mt-1">{t.name}</div>
                </div>
                <Settings2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.fields.map((f) => (
                  <span key={f.id} className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {f.name}: <span className="font-mono">{f.type}</span>
                  </span>
                ))}
                {t.fields.length === 0 && <span className="text-xs text-muted-foreground">{tr("tpl.noFields")}</span>}
              </div>
              {t.kind === "card" && (
                <div className="mt-3 text-xs text-muted-foreground">
                  {t.cardWidthMm ?? 63}×{t.cardHeightMm ?? 88} mm · {t.twoSided ? tr("tpl.twoSidedShort") : tr("tpl.singleSided")}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <TemplateEditor
          initial={editing ?? undefined}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function TemplateEditor({ initial, onClose }: { initial?: ComponentTemplate; onClose: () => void }) {
  const tr = useT();
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<ComponentKind>(initial?.kind ?? "card");
  const [fields, setFields] = useState<TemplateField[]>(initial?.fields ?? []);
  const [cardW, setCardW] = useState<number>(initial?.cardWidthMm ?? 63);
  const [cardH, setCardH] = useState<number>(initial?.cardHeightMm ?? 88);
  const [twoSided, setTwoSided] = useState<boolean>(initial?.twoSided ?? false);

  const addField = () => setFields([...fields, { id: uid(), name: "New field", type: "string" }]);
  const updField = (id: string, p: Partial<TemplateField>) =>
    setFields(fields.map((f) => (f.id === id ? { ...f, ...p } : f)));
  const removeField = (id: string) => setFields(fields.filter((f) => f.id !== id));

  const remove = async () => {
    if (!initial) return;
    if (!confirm(tr("tpl.deleteConfirm"))) return;
    await db.templates.delete(initial.id);
    onClose();
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const data: ComponentTemplate = {
      id: initial?.id ?? uid(),
      name: name.trim(),
      kind,
      fields,
      cardWidthMm: kind === "card" ? cardW : undefined,
      cardHeightMm: kind === "card" ? cardH : undefined,
      twoSided: kind === "card" ? twoSided : undefined,
      createdAt: initial?.createdAt ?? now(),
    };
    if (initial) await db.templates.put(data);
    else await db.templates.add(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={save} className="bg-card w-full max-w-2xl rounded-xl border border-border shadow-[var(--shadow-deep)] p-6 max-h-[92vh] overflow-auto">
        <h2 className="font-display text-2xl mb-4">{initial ? tr("tpl.edit") : tr("tpl.new")}</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr("game.field.name")}>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>
          <Field label={tr("tpl.kind")}>
            <select value={kind} onChange={(e) => setKind(e.target.value as ComponentKind)} className={inputCls}>
              {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </Field>
          {kind === "card" && (
            <>
              <Field label={tr("tpl.cardW")}>
                <input type="number" value={cardW} onChange={(e) => setCardW(Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label={tr("tpl.cardH")}>
                <input type="number" value={cardH} onChange={(e) => setCardH(Number(e.target.value))} className={inputCls} />
              </Field>
              <label className="col-span-2 inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={twoSided} onChange={(e) => setTwoSided(e.target.checked)} />
                {tr("tpl.twoSided")}
              </label>
            </>
          )}
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-lg">{tr("tpl.fields")}</h3>
            <button type="button" onClick={addField} className="text-sm inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 hover:bg-muted">
              <Plus className="h-3.5 w-3.5" /> {tr("tpl.addField")}
            </button>
          </div>
          {fields.length === 0 && <div className="text-sm text-muted-foreground border border-dashed border-border rounded-md p-4 text-center">{tr("tpl.noFields")}</div>}
          <div className="space-y-2">
            {fields.map((f) => (
              <div key={f.id} className="grid grid-cols-12 gap-2 items-center">
                <input value={f.name} onChange={(e) => updField(f.id, { name: e.target.value })} className={`${inputCls} col-span-5`} placeholder={tr("tpl.fieldName")} />
                <select value={f.type} onChange={(e) => updField(f.id, { type: e.target.value as FieldType })} className={`${inputCls} col-span-3`}>
                  {TYPES.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                </select>
                {f.type === "select" ? (
                  <input value={(f.options ?? []).join(", ")} onChange={(e) => updField(f.id, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} className={`${inputCls} col-span-3`} placeholder="opt1, opt2" />
                ) : (
                  <div className="col-span-3 text-xs text-muted-foreground">{f.type === "image" ? tr("tpl.imageHint") : ""}</div>
                )}
                <button type="button" onClick={() => removeField(f.id)} className="col-span-1 text-destructive hover:bg-destructive/10 rounded p-2">
                  <Trash2 className="h-4 w-4 mx-auto" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-between gap-2">
          <div>
            {initial && (
              <button type="button" onClick={remove} className="text-sm text-destructive hover:underline">{tr("tpl.deleteAction")}</button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border border-input hover:bg-muted">{tr("common.cancel")}</button>
            <button type="submit" className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90">{tr("common.save")}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
