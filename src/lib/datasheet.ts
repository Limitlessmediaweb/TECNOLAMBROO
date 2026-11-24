/**
 * Datasheet PDF del pezzo configurato (A4 verticale), generato nel browser dal riepilogo del
 * configuratore: intestazione con il logo, codice di configurazione, vista 3D, disegno quotato con
 * FLANGIA 1 / FLANGIA 2, tabella dei dati, dati elettrici e nota "da confermare in offerta".
 *
 * I dati elettrici arrivano solo da data/catalogo-ditta.ts e solo per la stessa famiglia e misura
 * (datasheet di catalogo Tecnolambro); se mancano compare il riquadro "su richiesta".
 * La pagina è composta in SVG e inserita nel PDF come immagine: così funziona in tutte le lingue del
 * sito (cinese compreso) senza incorporare font.
 */
import { BENDS, TFTG, TFTG_LENGTHS, TFTG_PRESSURE, TLFX_SHEET, bendRow } from "@/data/catalogo-ditta";
import { PRINT } from "@/data/brand";
import type { PartSpec } from "@/data/configurator/types";

export type SheetRow = { label: string; value: string };

/** Chiavi dei dati elettrici (i testi sono in messages → premium.sheet.el.<chiave>). */
export type ElectricalKey = "il" | "ilMax" | "rl" | "vswr" | "cw" | "rE" | "rH" | "twist" | "pMax" | "pOp";
export type Electrical = { source: string; values: { key: ElectricalKey; value: string }[] };

/**
 * Dati elettrici e meccanici di catalogo per questa configurazione, oppure null ("su richiesta").
 * `fmt` formatta i numeri nella lingua del sito.
 */
export function electricalFor(spec: PartSpec, fmt: (v: number, decimals?: number) => string): Electrical | null {
  if (spec.type === "twistable") {
    const r = TFTG[spec.wr];
    if (!r) return null;
    const values: Electrical["values"] = [{ key: "il", value: `${fmt(r.il, 2)} dB/m` }];
    // il return loss è dichiarato solo alle lunghezze di catalogo
    const L = spec.length as (typeof TFTG_LENGTHS)[number];
    if (TFTG_LENGTHS.includes(L)) values.push({ key: "rl", value: `${fmt(r.rl[L], 1)} dB` });
    values.push(
      { key: "cw", value: `${fmt(r.cw)} W` },
      { key: "rE", value: `${fmt(r.rE)} mm` },
      { key: "rH", value: `${fmt(r.rH)} mm` },
      { key: "twist", value: `${fmt(r.twist)} °/m` },
      { key: "pMax", value: `${fmt(TFTG_PRESSURE.max)} psi` },
      { key: "pOp", value: `${fmt(TFTG_PRESSURE.operating, 1)} psi` },
    );
    return { source: r.code, values };
  }
  if (spec.type === "seamless") {
    const r = TLFX_SHEET[spec.wr];
    if (!r) return null;
    return { source: r.code, values: [{ key: "il", value: `${fmt(r.il, 2)} dB/m` }, { key: "vswr", value: fmt(r.vswr, 2) }, { key: "rE", value: `${fmt(r.rE)} mm` }, { key: "rH", value: `${fmt(r.rH)} mm` }] };
  }
  if (spec.type === "bend" && (spec.angle ?? 90) === 90) {
    const r = bendRow(spec.wr, spec.plane);
    if (!r) return null;
    const values: Electrical["values"] = [];
    if (r.il != null) values.push({ key: "ilMax", value: `${fmt(r.il, 2)} dB` });
    values.push({ key: "vswr", value: fmt(r.vswr, 2) });
    return { source: `${spec.plane === "H" ? "TCH" : "TCE"}-${spec.wr.replace("WR-", "WR")}`, values };
  }
  return null;
}

/** Misure con un datasheet di catalogo per la curva (per il configuratore). */
export const BEND_SIZES = new Set(BENDS.map((b) => `${b.wr}|${b.plane}`));

export type SheetTexts = {
  /** "Scheda tecnica di configurazione" */
  title: string;
  codeLabel: string;
  view3d: string;
  drawing: string;
  dataTitle: string;
  electricalTitle: string;
  /** "Dati di catalogo {code}" */
  electricalSource: string;
  onRequestTitle: string;
  onRequestBody: string;
  note: string;
  dateLabel: string;
  el: Record<ElectricalKey, string>;
};

export type SheetInput = {
  code: string;
  /** nome del prodotto, es. "Guida flessibile twistabile" */
  product: string;
  rows: SheetRow[];
  electrical: Electrical | null;
  texts: SheetTexts;
  date: string;
  /** immagini come data URL */
  logo?: string | null;
  view3d?: string | null;
  drawing?: string | null;
  company: { name: string; address: string; contact: string };
};

const W = 595;
const H = 842;
const M = 36;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Spezza un testo su più righe di al più `max` caratteri (le lingue senza spazi vanno a capo a lunghezza fissa). */
function wrap(text: string, max: number): string[] {
  if (!/\s/.test(text) && text.length > max) return text.match(new RegExp(`.{1,${Math.max(8, Math.floor(max / 1.8))}}`, "g")) ?? [text];
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (line && (line + " " + word).length > max) {
      out.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) out.push(line);
  return out;
}

/** La pagina del datasheet come SVG (unità = punti tipografici, A4 595 × 842). */
export function datasheetSvg(i: SheetInput): string {
  const P = PRINT;
  const T = i.texts;
  const o: string[] = [];
  const text = (x: number, y: number, s: string, a: { size?: number; weight?: number; fill?: string; anchor?: string; mono?: boolean; spacing?: number } = {}) =>
    o.push(
      `<text x="${x}" y="${y}" font-size="${a.size ?? 9}" font-weight="${a.weight ?? 400}" fill="${a.fill ?? P.ink}" text-anchor="${a.anchor ?? "start"}"${a.mono ? ` font-family="Consolas, 'Courier New', monospace"` : ""}${a.spacing ? ` letter-spacing="${a.spacing}"` : ""}>${esc(s)}</text>`,
    );
  const box = (x: number, y: number, w: number, h: number, fill = "none", stroke: string = P.line) => o.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="0.6"/>`);

  o.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="'Segoe UI', 'Helvetica Neue', Arial, 'Microsoft YaHei', sans-serif">`);
  o.push(`<rect width="${W}" height="${H}" fill="${P.paper}"/>`);

  // intestazione: logo, nome dell'azienda, titolo del documento
  o.push(`<rect x="0" y="0" width="${W}" height="5" fill="${P.accent}"/>`);
  if (i.logo) o.push(`<image x="${M}" y="20" width="150" height="50" preserveAspectRatio="xMinYMid meet" xlink:href="${i.logo}" href="${i.logo}"/>`);
  text(W - M, 34, i.company.name.toUpperCase(), { size: 8.5, weight: 700, anchor: "end", spacing: 1.2 });
  text(W - M, 48, T.title.toUpperCase(), { size: 8, fill: P.accent, weight: 700, anchor: "end", spacing: 1.4 });
  text(W - M, 62, `${T.dateLabel} ${i.date}`, { size: 8, fill: P.muted, anchor: "end" });
  o.push(`<line x1="${M}" y1="80" x2="${W - M}" y2="80" stroke="${P.ink}" stroke-width="1.2"/>`);

  // prodotto e codice
  text(M, 104, i.product, { size: 17, weight: 700 });
  box(M, 114, W - 2 * M, 34, P.fill, P.fill);
  text(M + 10, 127, T.codeLabel.toUpperCase(), { size: 6.5, fill: P.muted, weight: 700, spacing: 1.2 });
  text(M + 10, 141, i.code, { size: i.code.length > 44 ? 10 : 12.5, weight: 700, mono: true });

  // vista 3D e tabella dei dati
  const top = 160;
  const vw = 236;
  const vh = 168;
  box(M, top, vw, vh, "#f4f7f9");
  if (i.view3d) o.push(`<image x="${M + 1}" y="${top + 1}" width="${vw - 2}" height="${vh - 2}" preserveAspectRatio="xMidYMid slice" xlink:href="${i.view3d}" href="${i.view3d}"/>`);
  text(M + 8, top + 13, T.view3d.toUpperCase(), { size: 6.5, fill: P.muted, weight: 700, spacing: 1.2 });

  const tx = M + vw + 14;
  const tw = W - M - tx;
  text(tx, top + 9, T.dataTitle.toUpperCase(), { size: 6.5, fill: P.accent, weight: 700, spacing: 1.2 });
  let y = top + 16;
  const rowH = Math.min(17, (vh - 16) / Math.max(1, i.rows.length));
  i.rows.forEach((r, k) => {
    if (k % 2 === 0) o.push(`<rect x="${tx}" y="${y}" width="${tw}" height="${rowH}" fill="${P.fill}" opacity="0.55"/>`);
    text(tx + 6, y + rowH * 0.66, r.label, { size: 7.6, fill: P.muted });
    const val = r.value.length > 40 ? `${r.value.slice(0, 39)}…` : r.value;
    text(tx + 98, y + rowH * 0.66, val, { size: 8.2, weight: 600 });
    y += rowH;
  });
  o.push(`<line x1="${tx}" y1="${top + 16}" x2="${tx + tw}" y2="${top + 16}" stroke="${P.ink}" stroke-width="0.8"/>`);

  // disegno quotato con FLANGIA 1 / FLANGIA 2
  const dy = top + vh + 14;
  const dw = W - 2 * M;
  const dh = Math.round(dw * 0.707);
  box(M, dy, dw, dh);
  if (i.drawing) o.push(`<image x="${M}" y="${dy}" width="${dw}" height="${dh}" preserveAspectRatio="xMidYMid meet" xlink:href="${i.drawing}" href="${i.drawing}"/>`);

  // dati elettrici di catalogo, oppure "su richiesta"
  const ey = dy + dh + 12;
  const eh = 62;
  if (i.electrical) {
    box(M, ey, dw, eh, "none", P.accent);
    text(M + 10, ey + 13, T.electricalTitle.toUpperCase(), { size: 6.5, fill: P.accent, weight: 700, spacing: 1.2 });
    text(W - M - 10, ey + 13, T.electricalSource.replace("{code}", i.electrical.source), { size: 6.5, fill: P.muted, anchor: "end" });
    const cols = 4;
    const cw = (dw - 20) / cols;
    i.electrical.values.slice(0, 8).forEach((v, k) => {
      const cx = M + 10 + (k % cols) * cw;
      const cy = ey + 26 + Math.floor(k / cols) * 19;
      text(cx, cy, T.el[v.key], { size: 6.3, fill: P.muted });
      text(cx, cy + 9.5, v.value, { size: 8.6, weight: 700 });
    });
  } else {
    box(M, ey, dw, eh, P.fill, P.line);
    text(M + 10, ey + 14, T.electricalTitle.toUpperCase(), { size: 6.5, fill: P.muted, weight: 700, spacing: 1.2 });
    text(M + 10, ey + 32, T.onRequestTitle, { size: 11, weight: 700 });
    wrap(T.onRequestBody, 120).slice(0, 2).forEach((l, k) => text(M + 10, ey + 45 + k * 10, l, { size: 7.6, fill: P.muted }));
  }

  // nota e piè di pagina
  const ny = ey + eh + 14;
  wrap(T.note, 128).slice(0, 2).forEach((l, k) => text(M, ny + k * 10, l, { size: 7.4, weight: 600 }));
  o.push(`<line x1="${M}" y1="${H - 40}" x2="${W - M}" y2="${H - 40}" stroke="${P.line}" stroke-width="0.6"/>`);
  text(M, H - 27, i.company.name, { size: 7.2, weight: 700 });
  text(M, H - 17, i.company.address, { size: 6.8, fill: P.muted });
  text(W - M, H - 27, i.company.contact, { size: 6.8, fill: P.muted, anchor: "end" });
  text(W - M, H - 17, i.code, { size: 6.4, fill: P.muted, anchor: "end", mono: true });
  o.push(`</svg>`);
  return o.join("");
}

async function rasterize(svg: string, w: number, h: number, scale: number): Promise<Uint8Array> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2D non disponibile");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    if (!blob) throw new Error("PNG non generato");
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}

const toDataUrl = (bytes: Uint8Array, mime: string) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(new Blob([bytes as BlobPart], { type: mime }));
  });

/**
 * PDF A4 del datasheet. `drawingSvg` è il disegno tecnico (lib/drawing.ts, palette "print"): viene
 * convertito in immagine prima di entrare nella pagina, perché un SVG dentro un altro SVG usato come
 * immagine non sempre si vede.
 */
export async function datasheetPdf(input: Omit<SheetInput, "logo" | "drawing"> & { drawingSvg?: string }, scale = 3): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  let logo: string | null = null;
  try {
    const res = await fetch("/brand/logo.png");
    if (res.ok) logo = await toDataUrl(new Uint8Array(await res.arrayBuffer()), "image/png");
  } catch {
    // senza logo il datasheet esce lo stesso, con il nome dell'azienda in testata
  }
  const drawing = input.drawingSvg ? await toDataUrl(await rasterize(input.drawingSvg, 1000, 707, 2), "image/png") : null;
  const png = await rasterize(datasheetSvg({ ...input, logo, drawing }), W, H, scale);
  const doc = await PDFDocument.create();
  doc.setTitle(`${input.code} – ${input.texts.title}`);
  doc.setAuthor(input.company.name);
  doc.setSubject(input.product);
  const page = doc.addPage([W, H]);
  page.drawImage(await doc.embedPng(png), { x: 0, y: 0, width: W, height: H });
  return doc.save();
}
