import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import { Printer, Scissors } from "lucide-react";
import { db, type ComponentInstance, type ComponentTemplate } from "@/lib/db";
import { Field, inputCls } from "./index";

export const Route = createFileRoute("/print")({
  component: PrintPage,
});

const PAGES = {
  A4: { w: 210, h: 297 },
  Letter: { w: 215.9, h: 279.4 },
} as const;

function PrintPage() {
  const games = useLiveQuery(() => db.games.toArray(), []);
  const templates = useLiveQuery(() => db.templates.toArray(), []);
  const components = useLiveQuery(() => db.components.toArray(), []);

  const [gameId, setGameId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [pageSize, setPageSize] = useState<keyof typeof PAGES>("A4");
  const [margin, setMargin] = useState(10);
  const [gap, setGap] = useState(2);
  const [bleed, setBleed] = useState(0);
  const [includeBacks, setIncludeBacks] = useState(true);
  const [generated, setGenerated] = useState<string | null>(null);

  const cardTemplates = (templates ?? []).filter((t) => t.kind === "card");

  const selected = useMemo(() => {
    if (!components || !templates) return [] as { c: ComponentInstance; t: ComponentTemplate }[];
    return components
      .filter((c) => (!gameId || c.gameId === gameId))
      .map((c) => ({ c, t: templates.find((t) => t.id === c.templateId)! }))
      .filter((x) => x.t && x.t.kind === "card" && (!templateId || x.t.id === templateId));
  }, [components, templates, gameId, templateId]);

  const totalCards = selected.reduce((n, x) => n + (x.c.quantity ?? 1), 0);

  const generate = async () => {
    if (selected.length === 0) {
      setGenerated(null);
      alert("No card components match the filters.");
      return;
    }
    const page = PAGES[pageSize];
    const pdf = new jsPDF({ unit: "mm", format: [page.w, page.h] });

    // Use first card template's dimensions for layout (cards of mixed sizes share pages by template)
    const groupsByTpl = new Map<string, typeof selected>();
    for (const x of selected) {
      const arr = groupsByTpl.get(x.t.id) ?? [];
      arr.push(x);
      groupsByTpl.set(x.t.id, arr);
    }

    let isFirst = true;

    for (const [, group] of groupsByTpl) {
      const tpl = group[0].t;
      const cw = (tpl.cardWidthMm ?? 63) + bleed * 2;
      const ch = (tpl.cardHeightMm ?? 88) + bleed * 2;
      const cols = Math.max(1, Math.floor((page.w - margin * 2 + gap) / (cw + gap)));
      const rows = Math.max(1, Math.floor((page.h - margin * 2 + gap) / (ch + gap)));
      const perPage = cols * rows;

      // expand quantities
      const flat: { img?: string; back?: string; name: string }[] = [];
      for (const { c } of group) {
        const q = c.quantity ?? 1;
        for (let i = 0; i < q; i++) flat.push({ img: c.frontImage, back: c.backImage, name: c.name });
      }

      for (let i = 0; i < flat.length; i += perPage) {
        if (!isFirst) pdf.addPage([page.w, page.h]);
        isFirst = false;
        const slice = flat.slice(i, i + perPage);
        drawSheet(pdf, slice.map((s) => s.img), { page, cols, rows, cw, ch, margin, gap, faceLabels: slice.map(s => s.name) });

        if (includeBacks && tpl.twoSided && slice.some((s) => s.back)) {
          pdf.addPage([page.w, page.h]);
          // mirror columns horizontally for duplex
          const mirrored: (string | undefined)[] = [];
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const idx = r * cols + (cols - 1 - c);
              mirrored.push(slice[idx]?.back);
            }
          }
          drawSheet(pdf, mirrored, { page, cols, rows, cw, ch, margin, gap });
        }
      }
    }

    const blob = pdf.output("blob");
    const url = URL.createObjectURL(blob);
    setGenerated(url);
  };

  return (
    <div className="px-6 md:px-10 py-6 md:py-8 max-w-6xl">
      <h1 className="font-display text-3xl md:text-4xl">Print Sheets</h1>
      <p className="text-muted-foreground text-sm mt-1">Auto-layout cards on printable sheets with cut marks.</p>

      <div className="mt-6 grid md:grid-cols-[360px_1fr] gap-6">
        <div className="bg-card border border-border rounded-xl p-5 shadow-[var(--shadow-card)] h-fit">
          <h2 className="font-display text-xl mb-3">Sheet options</h2>
          <div className="space-y-3">
            <Field label="Game">
              <select value={gameId} onChange={(e) => setGameId(e.target.value)} className={inputCls}>
                <option value="">All games</option>
                {(games ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </Field>
            <Field label="Card template">
              <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={inputCls}>
                <option value="">All card templates</option>
                {cardTemplates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.cardWidthMm}×{t.cardHeightMm}mm)</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Page">
                <select value={pageSize} onChange={(e) => setPageSize(e.target.value as keyof typeof PAGES)} className={inputCls}>
                  <option value="A4">A4</option>
                  <option value="Letter">Letter</option>
                </select>
              </Field>
              <Field label="Margin (mm)">
                <input type="number" value={margin} onChange={(e) => setMargin(Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Gap (mm)">
                <input type="number" value={gap} onChange={(e) => setGap(Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Bleed (mm)">
                <input type="number" value={bleed} onChange={(e) => setBleed(Number(e.target.value))} className={inputCls} />
              </Field>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeBacks} onChange={(e) => setIncludeBacks(e.target.checked)} />
              Include card backs (duplex mirrored)
            </label>
            <div className="text-xs text-muted-foreground">
              Matching cards: <span className="font-medium text-foreground">{totalCards}</span>
            </div>
            <button onClick={generate} className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90">
              <Printer className="h-4 w-4" /> Generate PDF
            </button>
          </div>
          <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
            <Scissors className="h-4 w-4 mt-0.5 flex-shrink-0" />
            Cut marks are placed just outside the card boundaries.
          </div>
        </div>

        <div className="bg-muted border border-border rounded-xl min-h-[60vh] overflow-hidden">
          {generated ? (
            <iframe src={generated} title="PDF preview" className="w-full h-[80vh] bg-white" />
          ) : (
            <div className="h-full grid place-items-center p-10 text-center text-muted-foreground">
              <div>
                <Printer className="h-10 w-10 mx-auto" />
                <p className="mt-3 text-sm">Configure options and click <span className="font-medium">Generate PDF</span> to preview.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function drawSheet(
  pdf: jsPDF,
  images: (string | undefined)[],
  opts: { page: { w: number; h: number }; cols: number; rows: number; cw: number; ch: number; margin: number; gap: number; faceLabels?: string[] }
) {
  const { page, cols, rows, cw, ch, margin, gap, faceLabels } = opts;
  const totalW = cols * cw + (cols - 1) * gap;
  const totalH = rows * ch + (rows - 1) * gap;
  const offsetX = (page.w - totalW) / 2;
  const offsetY = (page.h - totalH) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx >= images.length) break;
      const x = offsetX + c * (cw + gap);
      const y = offsetY + r * (ch + gap);
      const img = images[idx];
      if (img) {
        try {
          const fmt = img.startsWith("data:image/png") ? "PNG" : "JPEG";
          pdf.addImage(img, fmt, x, y, cw, ch, undefined, "FAST");
        } catch {
          pdf.setDrawColor(180); pdf.rect(x, y, cw, ch);
        }
      } else {
        pdf.setDrawColor(180);
        pdf.setLineWidth(0.2);
        pdf.rect(x, y, cw, ch);
        if (faceLabels?.[idx]) {
          pdf.setFontSize(9); pdf.setTextColor(120);
          pdf.text(faceLabels[idx], x + cw / 2, y + ch / 2, { align: "center" });
        }
      }
    }
  }

  // Cut marks
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.15);
  const m = 3; // mark length
  for (let c = 0; c <= cols; c++) {
    const x = offsetX + c * (cw + gap) - (c === 0 ? 0 : gap / 2);
    pdf.line(x, offsetY - m - 1, x, offsetY - 1);
    pdf.line(x, offsetY + totalH + 1, x, offsetY + totalH + m + 1);
  }
  for (let r = 0; r <= rows; r++) {
    const y = offsetY + r * (ch + gap) - (r === 0 ? 0 : gap / 2);
    pdf.line(offsetX - m - 1, y, offsetX - 1, y);
    pdf.line(offsetX + totalW + 1, y, offsetX + totalW + m + 1, y);
  }
}
