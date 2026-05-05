import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { Plus, Search, BookOpen, PackagePlus, Library as LibraryIcon } from "lucide-react";
import heroTable from "@/assets/hero-table.jpg";
import { db, uid, now, type Game, type GameKind } from "@/lib/db";
import { useT } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/")({
  component: LibraryPage,
});

function LibraryPage() {
  const games = useLiveQuery(() => db.games.toArray(), []);
  const [q, setQ] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const navigate = useNavigate();
  const t = useT();

  const tree = useMemo(() => {
    const all = games ?? [];
    const roots = all.filter((g) => !g.parentId);
    const byParent = new Map<string, Game[]>();
    all.forEach((g) => {
      if (g.parentId) {
        const arr = byParent.get(g.parentId) ?? [];
        arr.push(g);
        byParent.set(g.parentId, arr);
      }
    });
    const filt = (g: Game) =>
      !q ||
      g.name.toLowerCase().includes(q.toLowerCase()) ||
      g.author?.toLowerCase().includes(q.toLowerCase()) ||
      g.publisher?.toLowerCase().includes(q.toLowerCase());
    return { roots: roots.filter(filt), byParent };
  }, [games, q]);

  const isEmpty = (games?.length ?? 0) === 0;

  return (
    <div>
      {isEmpty && <Hero onAdd={() => setOpenNew(true)} />}

      <section className="px-6 md:px-10 py-6 md:py-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl md:text-4xl">{t("library.heading")}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t("library.subheading", { count: games?.length ?? 0 })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("library.searchPlaceholder")}
                className="pl-9 pr-3 py-2 text-sm rounded-md border border-input bg-card w-72 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={() => setOpenNew(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 shadow-[var(--shadow-card)]"
            >
              <Plus className="h-4 w-4" /> {t("library.newEntry")}
            </button>
          </div>
        </div>

        {tree.roots.length === 0 ? (
          <EmptyState onAdd={() => setOpenNew(true)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {tree.roots.map((g) => (
              <GameCard
                key={g.id}
                game={g}
                children={tree.byParent.get(g.id) ?? []}
                onOpen={() => navigate({ to: "/game/$id", params: { id: g.id } })}
              />
            ))}
          </div>
        )}
      </section>

      {openNew && <NewGameDialog onClose={() => setOpenNew(false)} />}
    </div>
  );
}

function Hero({ onAdd }: { onAdd: () => void }) {
  const t = useT();
  return (
    <section className="relative overflow-hidden border-b border-border">
      <img
        src={heroTable}
        alt="Vintage board game table with cards and dice"
        width={1600}
        height={1024}
        className="absolute inset-0 w-full h-full object-cover opacity-90"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/20" />
      <div className="relative px-6 md:px-12 py-16 md:py-24 max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-card/70 backdrop-blur px-3 py-1 text-xs uppercase tracking-widest text-accent-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {t("hero.badge")}
        </div>
        <h1 className="font-display text-5xl md:text-7xl mt-5 leading-[1.05]">
          {t("hero.title1")} <span className="brass-text">{t("hero.title2")}</span>
        </h1>
        <p className="text-base md:text-lg text-muted-foreground mt-5 max-w-xl">{t("hero.body")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-5 py-3 text-sm font-medium hover:bg-primary/90 shadow-[var(--shadow-deep)]"
          >
            <Plus className="h-4 w-4" /> {t("hero.cta")}
          </button>
        </div>
      </div>
    </section>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const t = useT();
  return (
    <div className="border border-dashed border-border rounded-xl p-12 text-center bg-card/40">
      <LibraryIcon className="h-10 w-10 mx-auto text-muted-foreground" />
      <h3 className="font-display text-2xl mt-4">{t("library.empty.title")}</h3>
      <p className="text-sm text-muted-foreground mt-1">{t("library.empty.body")}</p>
      <button
        onClick={onAdd}
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" /> {t("library.newEntry")}
      </button>
    </div>
  );
}

function GameCard({
  game,
  children,
  onOpen,
}: {
  game: Game;
  children: Game[];
  onOpen: () => void;
}) {
  const t = useT();
  return (
    <button
      onClick={onOpen}
      className="text-left group bg-card border border-border rounded-xl overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-deep)] transition-all hover:-translate-y-0.5"
    >
      <div className="aspect-[16/10] relative felt-surface">
        {game.coverImage ? (
          <img src={game.coverImage} alt={game.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center font-display text-3xl opacity-60">
            {game.name.slice(0, 1)}
          </div>
        )}
        <div className="absolute top-3 left-3">
          <KindBadge kind={game.kind} />
        </div>
      </div>
      <div className="p-4">
        <div className="font-display text-xl leading-tight">{game.name}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {[game.year, game.author, game.publisher].filter(Boolean).join(" · ") || "—"}
        </div>
        {children.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
            <PackagePlus className="h-3.5 w-3.5" />
            {children.length === 1
              ? t("card.additionsOne", { n: children.length })
              : t("card.additionsMany", { n: children.length })}
          </div>
        )}
      </div>
    </button>
  );
}

export function KindBadge({ kind }: { kind: GameKind }) {
  const t = useT();
  const styles: Record<GameKind, string> = {
    game: "bg-card/90 text-foreground border-border",
    series: "bg-accent/90 text-accent-foreground border-accent",
    expansion: "bg-primary/90 text-primary-foreground border-primary",
  };
  return (
    <span className={`inline-flex items-center text-[10px] uppercase tracking-widest px-2 py-1 rounded border ${styles[kind]}`}>
      {t(`kind.${kind}`)}
    </span>
  );
}

function NewGameDialog({ onClose, parentId }: { onClose: () => void; parentId?: string }) {
  const t = useT();
  const [form, setForm] = useState({
    name: "",
    kind: (parentId ? "expansion" : "game") as GameKind,
    parentId: parentId ?? "",
    year: "",
    author: "",
    publisher: "",
    genres: "",
    description: "",
  });
  const games = useLiveQuery(() => db.games.toArray(), []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const id = uid();
    const t = now();
    await db.games.add({
      id,
      name: form.name.trim(),
      kind: form.kind,
      parentId: form.parentId || null,
      year: form.year ? Number(form.year) : undefined,
      author: form.author || undefined,
      publisher: form.publisher || undefined,
      genres: form.genres
        ? form.genres.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
      description: form.description || undefined,
      createdAt: t,
      updatedAt: t,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-card w-full max-w-lg rounded-xl border border-border shadow-[var(--shadow-deep)] p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-5 w-5 text-accent" />
          <h2 className="font-display text-2xl">{t("game.new")}</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("game.field.name")} className="col-span-2">
            <input autoFocus required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          </Field>
          <Field label={t("game.field.type")}>
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as GameKind })} className={inputCls}>
              <option value="game">{t("kind.game")}</option>
              <option value="series">{t("kind.series")}</option>
              <option value="expansion">{t("kind.expansion")}</option>
            </select>
          </Field>
          <Field label={t("game.field.parent")}>
            <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className={inputCls}>
              <option value="">{t("common.none")}</option>
              {(games ?? [])
                .filter((g) => g.kind !== "expansion")
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({t(`kind.${g.kind}`)})
                  </option>
                ))}
            </select>
          </Field>
          <Field label={t("game.field.year")}>
            <input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className={inputCls} inputMode="numeric" />
          </Field>
          <Field label={t("game.field.author")}>
            <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className={inputCls} />
          </Field>
          <Field label={t("game.field.publisher")} className="col-span-2">
            <input value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} className={inputCls} />
          </Field>
          <Field label={t("game.field.genres")} className="col-span-2">
            <input value={form.genres} onChange={(e) => setForm({ ...form, genres: e.target.value })} className={inputCls} />
          </Field>
          <Field label={t("game.field.description")} className="col-span-2">
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border border-input hover:bg-muted">{t("common.cancel")}</button>
          <button type="submit" className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90">{t("common.save")}</button>
        </div>
      </form>
    </div>
  );
}

export const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">{label}</div>
      {children}
    </label>
  );
}
