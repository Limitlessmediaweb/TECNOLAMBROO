#!/usr/bin/env node
/**
 * npm run segnaposti — elenco di tutto quello che manca nelle pagine prodotti e trattamenti,
 * diviso per prodotto: i segnaposto "[DA COMPLETARE – foto/scheda: …]" scritti nei testi
 * (messages/it.json, catalogo/catalogo.csv) e le cartelle di foto ancora vuote.
 * Scrive SEGNAPOSTI.md (da girare a chi va in ditta a fare foto e schede) e lo stampa.
 * I segnaposto si vedono evidenziati in giallo solo in anteprima (NEXT_PUBLIC_DEMO=true);
 * nella versione pubblica spariscono da soli.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PHOTO_RE, classifyPhotos, readCatalog } from "../src/lib/catalog/schema.ts";

const ROOT = process.cwd();
const TODO_RE = /\[DA COMPLETARE[^\]]*\]/g;
const it = JSON.parse(readFileSync(join(ROOT, "messages", "it.json"), "utf8"));
const { rows } = readCatalog(readFileSync(join(ROOT, "catalogo", "catalogo.csv")));

/** Cosa chiede un segnaposto: il testo dopo "foto/scheda:" (o tutto il segnaposto). */
const what = (s) => s.replace(/^\[DA COMPLETARE\s*[–-]?\s*(foto\/scheda)?\s*:?\s*/i, "").replace(/\]$/, "").trim() || "dato da completare";
const photos = (dir) => (existsSync(join(ROOT, "public", dir)) ? readdirSync(join(ROOT, "public", dir)).filter((f) => PHOTO_RE.test(f)) : []);

/** Tutti i segnaposto in un valore (stringa, array, oggetto), con il nome del campo. */
function collect(value, field, out) {
  if (typeof value === "string") for (const m of value.match(TODO_RE) ?? []) out.push({ field, text: what(m) });
  else if (Array.isArray(value)) value.forEach((v) => collect(v, field, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) collect(v, k, out);
  return out;
}

const FIELD = { name: "Nome", short: "Riassunto", description: "Descrizione", applications: "Applicazioni", specs: "Caratteristiche tecniche", materials: "Materiali" };
// chiave → indirizzo italiano (src/data/families.ts)
const FAMILIES = { twistable: "guida-flessibile-twistabile", seamless: "guida-flessibile-seamless", bends: "curve", twists: "twist", offsets: "disassati" };
const sections = [];

// ------------------------------------------------------------------ famiglie (pagine /prodotti/…)
for (const [key, slug] of Object.entries(FAMILIES)) {
  const item = it.products.items[key];
  const sheet = collect(item, "", []).map((t) => ({ ...t, field: FIELD[t.field] ?? t.field }));
  const n = photos(`foto/prodotti/${key}`).length;
  sections.push({
    title: item.name,
    where: `pagina /prodotti/${slug} · testi in messages/*.json → products.items.${key}`,
    photo: n ? null : `Foto reali del prodotto: nessuna. Cartella: public/foto/prodotti/${key}/ (es. intero-1.jpg, dettaglio-flangia-1.jpg, lavorazione-1.jpg).`,
    sheet,
  });
}

// ------------------------------------------------------------------ catalogo e trattamenti (CSV)
for (const r of rows.filter((r) => r.state !== "esempio")) {
  const sheet = [];
  for (const [col, label] of [["name", "Nome"], ["description", "Descrizione"], ["use", "A cosa serve"], ["material", r.kind === "trattamento" ? "Materiali su cui si fa" : "Materiale"]]) {
    for (const t of collect(r[col]?.it ?? "", label, [])) sheet.push(t);
  }
  for (const [col, label] of [["sizes", "Misure"], ["norm", "Norma"]]) for (const t of collect(r[col], label, [])) sheet.push(t);
  const { gallery, before, after } = classifyPhotos(photos(`foto/${r.code}`));
  const missing = [];
  if (r.kind === "trattamento") {
    if (!before.length || !after.length) missing.push("coppia prima/dopo (prima.jpg e dopo.jpg: stesso pezzo, stessa inquadratura, prima e dopo il trattamento)");
    if (!gallery.length) missing.push("almeno una foto del trattamento o del pezzo trattato");
  } else if (!gallery.length) missing.push("foto del prodotto (1.jpg, 2.jpg…)");
  sections.push({
    title: `${r.kind === "trattamento" ? "Trattamento" : "Prodotto"}: ${r.name.it} (${r.code})`,
    where: `pagina /${r.kind === "trattamento" ? "trattamenti" : "catalogo"}/${r.slug} · riga ${r.line} di catalogo/catalogo.csv${r.state === "bozza" ? " · in bozza" : ""}`,
    photo: missing.length ? `Foto: ${missing.join("; ")}. Cartella: public/foto/${r.code}/.` : null,
    sheet,
  });
}

// ------------------------------------------------------------------ testo
const open = sections.filter((s) => s.photo || s.sheet.length);
const total = open.reduce((n, s) => n + s.sheet.length + (s.photo ? 1 : 0), 0);
const lines = [
  "# Segnaposti da completare: prodotti e trattamenti",
  "",
  `Generato con \`npm run segnaposti\` il ${new Date().toLocaleDateString("it-IT")}: **${total} voci** in ${open.length} schede.`,
  "",
  "Ogni voce corrisponde a un segnaposto giallo **[DA COMPLETARE – foto/scheda]** che si vede nell'anteprima del sito (`NEXT_PUBLIC_DEMO=true`).",
  "Nella versione pubblica i segnaposto non compaiono: il campo resta nascosto finché non arriva il dato vero.",
  "",
  "**Come consegnare:**",
  "- **Foto.** Orizzontali, lato lungo di almeno 2000 px, pezzo intero su fondo neutro, più un dettaglio.",
  "  Vanno nella cartella indicata, poi si lancia `npm run foto`.",
  "- **Schede.** Basta il dato scritto, anche a mano o in una foto del documento.",
  "  Le inserisce Riccardo in `messages/it.json` o in `catalogo/catalogo.csv`.",
  "",
];
for (const s of open) {
  lines.push(`## ${s.title}`, "", `_${s.where}_`, "");
  if (s.photo) lines.push(`- [ ] 📷 ${s.photo}`);
  for (const t of s.sheet) lines.push(`- [ ] 📝 **${t.field}:** ${t.text}`);
  lines.push("");
}
// domande aperte già registrate (todo.ts, CHECKLIST-SITO.md, NOTTE.md) che non sono segnaposto di una pagina
lines.push(
  "## Altre domande per la ditta",
  "",
  "_non sono segnaposto di una pagina, ma servono per completare il catalogo_",
  "",
  "- [ ] 📝 **Quarta famiglia di prodotto** (oggi nascosta): esiste? Nome, descrizione, misure (es. transizioni o carichi?).",
  "- [ ] 📝 **Prodotti tolti dal sito a ottobre:** confermare che non sono più a catalogo.",
  "  Sono illuminatori d'antenna, transizioni, flange e kit di installazione, guida rigida a tratti dritti ed elettroformatura in nichel.",
  "- [ ] 📝 **Tabelle tecniche:** controllare i valori sul documento originale.",
  "  Sul sito sono stati trascritti a mano da un'immagine a bassa risoluzione.",
  "- [ ] 📝 **Collaudo:** quali strumenti usate e quali parametri misurate (pagina Qualità).",
  "- [ ] 📝 **Trattamenti:** si fanno davvero su tutti i pezzi (twistabile, seamless, curve, twist, disassati)?",
  "- [ ] 📷 **Officina:** lavorazione, collaudo e magazzino, 2-3 foto ciascuno.",
  "  Cartella `public/foto/officina/`, con nomi tipo `lavorazione-1.jpg`, `collaudo-1.jpg`, `magazzino-1.jpg`.",
  "- [ ] 📷 **Ritratto di Marco Pasquini:** `public/foto/persone/marco-pasquini.jpg`.",
  "",
);
const done = sections.filter((s) => !s.photo && !s.sheet.length).map((s) => s.title);
if (done.length) lines.push("## Già completi", "", ...done.map((d) => `- ${d}`), "");

writeFileSync(join(ROOT, "SEGNAPOSTI.md"), lines.join("\n"));
console.log(lines.join("\n"));
