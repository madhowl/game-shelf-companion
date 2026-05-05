import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Upload, FileJson } from "lucide-react";
import { db } from "@/lib/db";
import { downloadBlob } from "@/lib/utils-format";
import { useT } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/data")({
  component: DataPage,
});

function DataPage() {
  const t = useT();
  const [msg, setMsg] = useState<string>("");

  const exportAll = async () => {
    const [games, templates, components] = await Promise.all([
      db.games.toArray(),
      db.templates.toArray(),
      db.components.toArray(),
    ]);
    const payload = {
      app: "meeple-vault",
      version: 1,
      exportedAt: new Date().toISOString(),
      games,
      templates,
      components,
    };
    downloadBlob(JSON.stringify(payload, null, 2), `meeple-vault-${Date.now()}.json`, "application/json");
    setMsg(t("data.exported", { g: games.length, t: templates.length, c: components.length }));
  };

  const importFile = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.app !== "meeple-vault") throw new Error(t("data.errFile"));
      await db.transaction("rw", db.games, db.templates, db.components, async () => {
        if (Array.isArray(data.games)) await db.games.bulkPut(data.games);
        if (Array.isArray(data.templates)) await db.templates.bulkPut(data.templates);
        if (Array.isArray(data.components)) await db.components.bulkPut(data.components);
      });
      setMsg(t("data.imported", { g: data.games?.length ?? 0, t: data.templates?.length ?? 0, c: data.components?.length ?? 0 }));
    } catch (e: any) {
      setMsg(t("data.error", { msg: e.message }));
    }
  };

  const wipe = async () => {
    if (!confirm(t("data.wipeConfirm"))) return;
    await db.delete();
    location.reload();
  };

  return (
    <div className="px-6 md:px-10 py-6 md:py-8 max-w-3xl">
      <h1 className="font-display text-3xl md:text-4xl">{t("data.heading")}</h1>
      <p className="text-muted-foreground text-sm mt-1">{t("data.sub")}</p>

      <div className="mt-8 grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-6 shadow-[var(--shadow-card)]">
          <Download className="h-6 w-6 text-accent" />
          <h2 className="font-display text-2xl mt-3">{t("data.exportTitle")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("data.exportBody")}</p>
          <button onClick={exportAll} className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm hover:bg-primary/90">
            <FileJson className="h-4 w-4" /> {t("data.exportBtn")}
          </button>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-[var(--shadow-card)]">
          <Upload className="h-6 w-6 text-accent" />
          <h2 className="font-display text-2xl mt-3">{t("data.importTitle")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("data.importBody")}</p>
          <label className="mt-4 inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm hover:bg-muted cursor-pointer">
            <Upload className="h-4 w-4" /> {t("data.chooseFile")}
            <input type="file" accept="application/json" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importFile(f);
            }} />
          </label>
        </div>
      </div>

      {msg && <div className="mt-6 text-sm rounded-md border border-border bg-muted px-4 py-3">{msg}</div>}

      <div className="mt-12 border-t border-border pt-6">
        <h3 className="font-display text-xl">{t("data.danger")}</h3>
        <button onClick={wipe} className="mt-3 text-sm text-destructive border border-destructive/40 px-3 py-2 rounded-md hover:bg-destructive/10">
          {t("data.wipe")}
        </button>
      </div>
    </div>
  );
}
