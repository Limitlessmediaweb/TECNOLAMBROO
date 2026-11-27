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
import { BENDS, TFTG, TFTG_LENGTHS, TFTG_PRESSURE, TLFX_SHEET, TTG, bendRow, rigidSheets } from "@/data/catalogo-ditta";
import { PRINT } from "@/data/brand";
import type { PartSpec } from "@/data/configurator/types";
import { ON_REQUEST, type SheetField } from "./datasheet-fields";

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
  if (spec.type === "straight" || spec.type === "pressure" || spec.type === "termination" || spec.type === "spacer") {
    // solo se misura E lunghezza sono quelle di un nostro datasheet
    const r = rigidSheets(spec.type, spec.wr).find((x) => x.L === spec.length && x.vswr != null);
    if (!r) return null;
    const values: Electrical["values"] = [{ key: "vswr", value: fmt(r.vswr!, 2) }];
    if (r.il) values.push({ key: r.il.includes("/m") ? "il" : "ilMax", value: r.il });
    if (r.pMax) values.push({ key: "pMax", value: `${fmt(r.pMax)} psi` });
    return { source: r.code, values };
  }
  if (spec.type === "transition") {
    const r = TTG.find((x) => x.L === spec.length && x.vswr != null && ((x.wr === spec.wr && x.wr2 === spec.wr2) || (x.wr === spec.wr2 && x.wr2 === spec.wr)));
    if (!r) return null;
    return { source: r.code, values: [{ key: "vswr", value: fmt(r.vswr!, 2) }] };
  }
  return null;
}

/** Misure con un datasheet di catalogo per la curva (per il configuratore). */
export const BEND_SIZES = new Set(BENDS.map((b) => `${b.wr}|${b.plane}`));

export type SheetInput = {
  code: string;
  /** nome del prodotto in italiano e in inglese */
  product: string;
  /** campi del datasheet (lib/datasheet-fields.ts), sempre tutti */
  fields: SheetField[];
  /** "ED. 11/26 REV 00" */
  edition: string;
  date: string;
  /** testo della nota finale (bilingue) */
  note: string;
  /** immagini come data URL */
  logo?: string | null;
  view3d?: string | null;
  drawing?: string | null;
  company: { name: string; address: string; contact: string };
};

const W = 595;
const H = 842;
const M = 32;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Spezza la nota in righe di al più `max` caratteri. */
function wrapNote(t: string, max: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const w of t.split(/\s+/)) {
    if (line && (line + " " + w).length > max) {
      out.push(line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  if (line) out.push(line);
  return out;
}
const GROUPS: Record<SheetField["group"], string> = { id: "IDENTIFICAZIONE / IDENTIFICATION", rf: "DATI RF / RF DATA", mech: "MECCANICA E PRESSURIZZAZIONE / MECHANICAL AND PRESSURIZATION" };

/**
 * La pagina del datasheet come SVG (unità = punti tipografici, A4 595 × 842): intestazione con logo,
 * codice grande, vista 3D e disegno tecnico affiancati, tabella con tutti i campi del datasheet
 * ufficiale (italiano / inglese) e cartiglio in basso come nell'originale.
 */
export function datasheetSvg(i: SheetInput): string {
  const P = PRINT;
  const o: string[] = [];
  const text = (x: number, y: number, s: string, a: { size?: number; weight?: number; fill?: string; anchor?: string; mono?: boolean; spacing?: number; italic?: boolean } = {}) =>
    o.push(
      `<text x="${x}" y="${y}" font-size="${a.size ?? 9}" font-weight="${a.weight ?? 400}" fill="${a.fill ?? P.ink}" text-anchor="${a.anchor ?? "start"}"${a.mono ? ` font-family="Consolas, 'Courier New', monospace"` : ""}${a.spacing ? ` letter-spacing="${a.spacing}"` : ""}${a.italic ? ` font-style="italic"` : ""}>${esc(s)}</text>`,
    );
  const rect = (x: number, y: number, w: number, h: number, fill = "none", stroke: string = P.line, sw = 0.6, r = 0) =>
    o.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`);

  o.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif">`);
  o.push(`<defs><linearGradient id="v3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7f9fb"/><stop offset="1" stop-color="#e7edf2"/></linearGradient></defs>`);
  o.push(`<rect width="${W}" height="${H}" fill="${P.paper}"/>`);

  // ---- intestazione
  o.push(`<rect x="0" y="0" width="${W}" height="4" fill="${P.accent}"/>`);
  if (i.logo) o.push(`<image x="${M}" y="18" width="138" height="50" preserveAspectRatio="xMinYMid meet" xlink:href="${i.logo}" href="${i.logo}"/>`);
  text(W - M, 32, "DATASHEET", { size: 8, weight: 700, fill: P.accent, anchor: "end", spacing: 2.4 });
  text(W - M, 45, "Scheda tecnica / Technical datasheet", { size: 8, anchor: "end" });
  text(W - M, 58, `${i.edition} · ${i.date}`, { size: 7, fill: P.muted, anchor: "end", mono: true });
  o.push(`<line x1="${M}" y1="76" x2="${W - M}" y2="76" stroke="${P.ink}" stroke-width="1.1"/>`);

  // ---- codice grande
  text(M, 96, "CODICE / PART NUMBER", { size: 6.8, weight: 700, fill: P.muted, spacing: 1.6 });
  const codeSize = i.code.length > 30 ? 17 : i.code.length > 22 ? 21 : 26;
  text(M, 96 + codeSize + 4, i.code, { size: codeSize, weight: 700, spacing: 0.4 });
  text(M, 96 + codeSize + 21, i.product, { size: 9.5, fill: P.muted });

  // ---- vista 3D e disegno tecnico
  const top = 158;
  const vh = 188;
  const vw = 252;
  rect(M, top, vw, vh, "url(#v3)", P.line, 0.6, 3);
  if (i.view3d) o.push(`<image x="${M + 1}" y="${top + 1}" width="${vw - 2}" height="${vh - 2}" preserveAspectRatio="xMidYMid slice" xlink:href="${i.view3d}" href="${i.view3d}"/>`);
  text(M + 9, top + 14, "VISTA 3D / 3D VIEW", { size: 6, weight: 700, fill: P.muted, spacing: 1.2 });
  const dx = M + vw + 10;
  const dw = W - M - dx;
  rect(dx, top, dw, vh, P.paper, P.line, 0.6, 3);
  if (i.drawing) o.push(`<image x="${dx + 2}" y="${top + 2}" width="${dw - 4}" height="${vh - 4}" preserveAspectRatio="xMidYMid meet" xlink:href="${i.drawing}" href="${i.drawing}"/>`);

  // ---- tabella dei campi
  let y = top + vh + 16;
  const rowH = 16.4;
  const vx = M + 214;
  let group: SheetField["group"] | null = null;
  let k = 0;
  for (const f of i.fields) {
    if (f.group !== group) {
      group = f.group;
      y += group === "id" ? 0 : 5;
      text(M, y + 8, GROUPS[group], { size: 6.4, weight: 700, fill: P.accent, spacing: 1.3 });
      o.push(`<line x1="${M}" y1="${y + 12}" x2="${W - M}" y2="${y + 12}" stroke="${P.ink}" stroke-width="0.7"/>`);
      y += 13;
      k = 0;
    }
    if (k % 2 === 1) o.push(`<rect x="${M}" y="${y}" width="${W - 2 * M}" height="${rowH}" fill="${P.fill}" opacity="0.6"/>`);
    text(M + 4, y + 7.4, f.it, { size: 7.4, weight: 600 });
    text(M + 4, y + 14, f.en, { size: 5.9, fill: P.muted });
    if (f.value) {
      const v = f.value.length > 74 ? `${f.value.slice(0, 73)}…` : f.value;
      text(vx, y + 11, v, { size: v.length > 58 ? 7.2 : 8.4, weight: 600 });
    } else {
      o.push(`<circle cx="${vx + 2.5}" cy="${y + 8.3}" r="2" fill="none" stroke="${P.accent}" stroke-width="0.8"/>`);
      text(vx + 9, y + 11, ON_REQUEST, { size: 8, fill: P.muted, italic: true });
    }
    y += rowH;
    k++;
  }

  // ---- nota e cartiglio (come nell'originale: azienda a sinistra, codice a destra)
  wrapNote(i.note, 150).slice(0, 2).forEach((l, n) => text(M, y + 13 + n * 9, l, { size: 6.6, fill: P.muted }));
  const by = H - 50;
  const bw = W - 2 * M;
  const cw = 168;
  rect(M, by, bw, 34, "none", P.ink, 1.1);
  o.push(`<line x1="${W - M - cw}" y1="${by}" x2="${W - M - cw}" y2="${by + 34}" stroke="${P.ink}" stroke-width="1.1"/>`);
  text(M + 10, by + 15, i.company.name.toUpperCase(), { size: 10, weight: 700, spacing: 0.6 });
  text(M + 10, by + 27, `${i.company.address} · ${i.company.contact}`, { size: 6.2, fill: P.muted });
  text(W - M - cw + 9, by + 11, "CODICE / CODE", { size: 5.8, fill: P.muted, spacing: 1 });
  text(W - M - cw + 9, by + 26, i.code, { size: i.code.length > 24 ? 9 : 11, weight: 700 });
  text(W - M, H - 8, i.edition, { size: 6, fill: P.muted, anchor: "end", mono: true });
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
export async function datasheetPdf(input: Omit<SheetInput, "logo" | "drawing"> & { drawingSvg?: string }, scale = 4): Promise<Uint8Array> {
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
  doc.setTitle(`${input.code} – Datasheet`);
  doc.setAuthor(input.company.name);
  doc.setSubject(input.product);
  const page = doc.addPage([W, H]);
  page.drawImage(await doc.embedPng(png), { x: 0, y: 0, width: W, height: H });
  return doc.save();
}
