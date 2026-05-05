import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { ArrowLeft, Edit3, Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { db, now, uid, type Game, type ComponentInstance } from "@/lib/db";
import { Field, KindBadge, inputCls } from "./index";
import { fileToDataUrl } from "@/lib/utils-format";

export const Route = createFileRoute("/game/$id")({
  component: GameDetail,
});

function GameDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const game = useLiveQuery(() => db.games.get(id), [id]);
  const children = useLiveQuery(() => db.games.where("parentId").equals(id).toArray(), [id]);
  const components = useLiveQuery(() => db.components.where("gameId").equals(id).toArray(), [id]);
  const templates = useLiveQuery(() => db.templates.toArray(), []);
  const [editing, setEditing] = useState(false);
  const [addComp, setAddComp] = useState(false);

  if (!game) {
    return (
      <div className="p-10">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        <p className="mt-6">Game not found.</p>
      </div>
    );
  }

  const remove = async () => {
    if (!confirm("Delete this entry and all its components?")) return;
    await db.components.where("gameId").equals(id).delete();
    await db.games.where("parentId").equals(id).modify({ parentId: null });
    await db.games.delete(id);
    navigate({ to: "/" });
  };

  return (
    <div className="px-6 md:px-10 py-6 max-w-6xl">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Library
      </Link>

      <header className="mt-4 flex flex-col md:flex-row gap-6 items-start">
        <div className="w-full md:w-64 aspect-[3/4] rounded-xl overflow-hidden border border-border felt-surface relative shadow-[var(--shadow-card)]">
          {game.coverImage ? (
            <img src={game.coverImage} alt={game.name} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 grid place-items-center font-display text-5xl opacity-50">
              {game.name.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="flex-1">
          <KindBadge kind={game.kind} />
          <h1 className="font-display text-4xl md:text-5xl mt-3">{game.name}</h1>
          <div className="text-sm text-muted-foreground mt-2">
            {[game.year, game.author, game.publisher].filter(Boolean).join(" · ") || "—"}
          </div>
          {game.genres && game.genres.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {game.genres.map((g) => (
                <span key={g} className="text-[11px] uppercase tracking-widest px-2 py-1 rounded bg-muted text-muted-foreground">
                  {g}
                </span>
              ))}
            </div>
          )}
          {game.description && (
            <p className="mt-4 text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap max-w-2xl">{game.description}</p>
          )}
          <div className="mt-5 flex gap-2">
            <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-2 text-sm hover:bg-muted">
              <Edit3 className="h-4 w-4" /> Edit
            </button>
            <button onClick={remove} className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 text-destructive px-3 py-2 text-sm hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>
      </header>

      {/* Children (expansions / series members) */}
      <section className="mt-12">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-2xl">{game.kind === "series" ? "Games in series" : "Expansions"}</h2>
        </div>
        {(children?.length ?? 0) === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-6">
            No additions yet. Create a new entry from the library and set this as its parent.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {children!.map((c) => (
              <Link
                key={c.id}
                to="/game/$id"
                params={{ id: c.id }}
                className="border border-border rounded-lg p-3 bg-card hover:border-accent transition-colors"
              >
                <KindBadge kind={c.kind} />
                <div className="font-display text-lg mt-2">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.year ?? "—"}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Components */}
      <section className="mt-12">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-2xl">Components</h2>
          <button onClick={() => setAddComp(true)} className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Add component
          </button>
        </div>
        {(components?.length ?? 0) === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-6">
            No components yet. Define templates under <Link to="/templates" className="underline">Components</Link>, then add instances here.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {components!.map((c) => {
              const tpl = templates?.find((t) => t.id === c.templateId);
              return <ComponentRow key={c.id} comp={c} tplName={tpl?.name ?? "Unknown"} />;
            })}
          </div>
        )}
      </section>

      {editing && <EditGameDialog game={game} onClose={() => setEditing(false)} />}
      {addComp && <AddComponentDialog gameId={id} onClose={() => setAddComp(false)} />}
    </div>
  );
}

function ComponentRow({ comp, tplName }: { comp: ComponentInstance; tplName: string }) {
  const remove = async () => {
    if (!confirm("Remove component?")) return;
    await db.components.delete(comp.id);
  };
  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <div className="aspect-[5/3] bg-muted relative">
        {comp.frontImage ? (
          <img src={comp.frontImage} alt={comp.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground">
            <ImageIcon className="h-6 w-6" />
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{tplName}</div>
        <div className="font-medium text-sm">{comp.name}</div>
        {comp.quantity && comp.quantity > 1 && (
          <div className="text-xs text-muted-foreground">×{comp.quantity}</div>
        )}
        <button onClick={remove} className="mt-2 text-xs text-destructive hover:underline">Remove</button>
      </div>
    </div>
  );
}

function EditGameDialog({ game, onClose }: { game: Game; onClose: () => void }) {
  const games = useLiveQuery(() => db.games.toArray(), []);
  const [form, setForm] = useState({
    ...game,
    yearStr: game.year?.toString() ?? "",
    genresStr: (game.genres ?? []).join(", "),
  });

  const onCover = async (f: File | null) => {
    if (!f) return;
    const url = await fileToDataUrl(f);
    setForm({ ...form, coverImage: url });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.games.update(game.id, {
      name: form.name,
      kind: form.kind,
      parentId: form.parentId || null,
      year: form.yearStr ? Number(form.yearStr) : undefined,
      author: form.author || undefined,
      publisher: form.publisher || undefined,
      genres: form.genresStr ? form.genresStr.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      description: form.description || undefined,
      coverImage: form.coverImage,
      updatedAt: now(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="bg-card w-full max-w-lg rounded-xl border border-border shadow-[var(--shadow-deep)] p-6 max-h-[90vh] overflow-auto">
        <h2 className="font-display text-2xl mb-4">Edit entry</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" className="col-span-2">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Type">
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Game["kind"] })} className={inputCls}>
              <option value="game">Game</option>
              <option value="series">Series</option>
              <option value="expansion">Expansion</option>
            </select>
          </Field>
          <Field label="Parent">
            <select value={form.parentId ?? ""} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className={inputCls}>
              <option value="">— None —</option>
              {(games ?? []).filter((g) => g.id !== game.id && g.kind !== "expansion").map((g) => (
                <option key={g.id} value={g.id}>{g.name} ({g.kind})</option>
              ))}
            </select>
          </Field>
          <Field label="Year">
            <input value={form.yearStr} onChange={(e) => setForm({ ...form, yearStr: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Author">
            <input value={form.author ?? ""} onChange={(e) => setForm({ ...form, author: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Publisher" className="col-span-2">
            <input value={form.publisher ?? ""} onChange={(e) => setForm({ ...form, publisher: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Genres (comma separated)" className="col-span-2">
            <input value={form.genresStr} onChange={(e) => setForm({ ...form, genresStr: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Description" className="col-span-2">
            <textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Cover image" className="col-span-2">
            <input type="file" accept="image/*" onChange={(e) => onCover(e.target.files?.[0] ?? null)} className="text-sm" />
            {form.coverImage && <img src={form.coverImage} alt="" className="mt-2 h-24 rounded border border-border object-cover" />}
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border border-input hover:bg-muted">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90">Save</button>
        </div>
      </form>
    </div>
  );
}

function AddComponentDialog({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const tr = useT();
  const templates = useLiveQuery(() => db.templates.toArray(), []);
  const [templateId, setTemplateId] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [frontImage, setFrontImage] = useState<string | undefined>();
  const [backImage, setBackImage] = useState<string | undefined>();
  const tpl = templates?.find((t) => t.id === templateId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateId || !name.trim()) return;
    await db.components.add({
      id: uid(),
      gameId,
      templateId,
      name: name.trim(),
      values,
      frontImage,
      backImage,
      quantity,
      createdAt: now(),
      updatedAt: now(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="bg-card w-full max-w-lg rounded-xl border border-border shadow-[var(--shadow-deep)] p-6 max-h-[90vh] overflow-auto">
        <h2 className="font-display text-2xl mb-4">{tr("comp.add")}</h2>
        {(templates?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tr("comp.noTemplates", { link: "" }).split("{link}")[0]}
            <Link onClick={onClose} to="/templates" className="underline">{tr("nav.templates")}</Link>
            {tr("comp.noTemplates", { link: "" }).split("{link}")[1] ?? ""}
          </p>
        ) : (
          <div className="space-y-3">
            <Field label={tr("comp.template")}>
              <select value={templateId} onChange={(e) => { setTemplateId(e.target.value); setValues({}); }} className={inputCls}>
                <option value="">{tr("common.none")}</option>
                {templates!.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={tr("game.field.name")}>
                <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
              </Field>
              <Field label={tr("comp.quantity")}>
                <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className={inputCls} />
              </Field>
            </div>
            {tpl?.fields.map((f) => (
              <Field key={f.id} label={f.name}>
                {f.type === "longtext" ? (
                  <textarea className={inputCls} value={(values[f.id] as string) ?? ""} onChange={(e) => setValues({ ...values, [f.id]: e.target.value })} />
                ) : f.type === "number" ? (
                  <input type="number" className={inputCls} value={(values[f.id] as number) ?? ""} onChange={(e) => setValues({ ...values, [f.id]: Number(e.target.value) })} />
                ) : f.type === "boolean" ? (
                  <input type="checkbox" checked={!!values[f.id]} onChange={(e) => setValues({ ...values, [f.id]: e.target.checked })} />
                ) : f.type === "select" ? (
                  <select className={inputCls} value={(values[f.id] as string) ?? ""} onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}>
                    <option value="">—</option>
                    {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input className={inputCls} value={(values[f.id] as string) ?? ""} onChange={(e) => setValues({ ...values, [f.id]: e.target.value })} />
                )}
              </Field>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <Field label={tr("comp.frontImage")}>
                <input type="file" accept="image/*" className="text-sm" onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setFrontImage(await fileToDataUrl(f));
                }} />
                {frontImage && <img src={frontImage} alt="" className="mt-2 h-20 rounded border border-border object-cover" />}
              </Field>
              {tpl?.twoSided && (
                <Field label={tr("comp.backImage")}>
                  <input type="file" accept="image/*" className="text-sm" onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) setBackImage(await fileToDataUrl(f));
                  }} />
                  {backImage && <img src={backImage} alt="" className="mt-2 h-20 rounded border border-border object-cover" />}
                </Field>
              )}
            </div>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border border-input hover:bg-muted">{tr("common.cancel")}</button>
          <button type="submit" disabled={(templates?.length ?? 0) === 0} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40">{tr("common.save")}</button>
        </div>
      </form>
    </div>
  );
}
