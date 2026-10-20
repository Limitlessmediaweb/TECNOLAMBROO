#!/usr/bin/env node
/**
 * npm run catalogo:check — controlla catalogo/catalogo.csv e le foto in public/foto/<CODICE>/
 * e stampa cosa sistemare:
 *  - colonne mancanti, ripetute o sconosciute; separatore sbagliato; file non in UTF-8;
 *  - righe con campi in più o in meno, tipo e stato non validi, codici non validi o doppi;
 *  - trattamenti citati dai prodotti ma inesistenti o non pubblicati;
 *  - testi e traduzioni mancanti nelle righe pubblicate, righe di ESEMPIO ancora presenti;
 *  - cartelle di foto senza prodotto (anche per maiuscole/minuscole diverse), formati non adatti,
 *    foto ancora in JPG (npm run foto le converte), prodotti pubblicati senza foto.
 * Esce con codice 1 se ci sono errori (le righe con errori non vanno online).
 * Usa lo stesso lettore del sito: src/lib/catalog/schema.ts.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { PHOTO_RE, RESERVED_PHOTO_DIRS, classifyPhotos, readCatalog } from "../src/lib/catalog/schema.ts";

const ROOT = process.cwd();
const CSV = process.env.CATALOGO_CSV ?? join(ROOT, "catalogo", "catalogo.csv");
const PHOTOS = process.env.CATALOGO_FOTO ?? join(ROOT, "public", "foto");
const BIG = 3 * 1024 * 1024;

if (!existsSync(CSV)) {
  console.error("✗ Non trovo catalogo/catalogo.csv.");
  process.exit(1);
}

const { rows, issues, allCodes } = readCatalog(readFileSync(CSV));
const add = (level, message, extra = {}) => issues.push({ level, message, ...extra });

// ------------------------------------------------------------------ foto
const codes = new Map(rows.map((r) => [r.code, r]));
const codesLower = new Map(rows.map((r) => [r.slug, r]));
const dirs = existsSync(PHOTOS) ? readdirSync(PHOTOS).filter((d) => statSync(join(PHOTOS, d)).isDirectory()) : [];
const jpgs = [];

for (const d of dirs) {
  if (RESERVED_PHOTO_DIRS.includes(d)) continue;
  const row = codes.get(d);
  if (!row && allCodes.includes(d)) continue; // riga con errori: già segnalata
  if (!row) {
    const near = codesLower.get(d.toLowerCase());
    if (near) add("error", `La cartella public/foto/${d}/ non corrisponde al codice “${near.code}”: rinominala esattamente ${near.code} (online maiuscole e minuscole contano).`, { line: near.line, code: near.code });
    else add("warning", `Foto senza prodotto: la cartella public/foto/${d}/ non corrisponde a nessun codice del CSV.`);
    continue;
  }
  const files = readdirSync(join(PHOTOS, d));
  for (const f of files) {
    const p = join(PHOTOS, d, f);
    if (statSync(p).isDirectory()) {
      add("warning", `public/foto/${d}/${f}/: le sottocartelle non vengono lette, metti le foto direttamente in public/foto/${d}/.`, { code: d });
      continue;
    }
    if (f.startsWith(".")) continue;
    if (!PHOTO_RE.test(f)) add("warning", `public/foto/${d}/${f}: formato non usato dal sito (vanno bene JPG, PNG, WebP).`, { code: d });
    else if (/\.jpe?g$/i.test(f)) jpgs.push(`${d}/${f}`);
    else if (statSync(p).size > BIG) add("warning", `public/foto/${d}/${f} pesa ${(statSync(p).size / 1048576).toFixed(1)} MB: rimpiccioliscila.`, { code: d });
  }
  const { gallery, before, after } = classifyPhotos(files);
  if (row.kind === "prodotto" && (before.length || after.length)) add("warning", `public/foto/${d}/: i nomi prima*/dopo* valgono solo per i trattamenti; per i prodotti usa 1.jpg, 2.jpg…`, { line: row.line, code: d });
  if (row.kind === "trattamento" && before.length !== after.length) add("warning", `public/foto/${d}/: ${before.length} foto “prima” e ${after.length} “dopo”: nelle coppie il lato mancante resta neutro.`, { line: row.line, code: d });
  if (!gallery.length && !before.length && !after.length) add("warning", `public/foto/${d}/ è vuota.`, { line: row.line, code: d });
}
for (const r of rows) {
  if (r.state !== "pubblicato" || dirs.includes(r.code)) continue;
  if (dirs.some((d) => d.toLowerCase() === r.slug)) continue; // già segnalata sopra
  add("warning", `Nessuna foto: crea public/foto/${r.code}/ con ${r.kind === "prodotto" ? "1.jpg, 2.jpg e così via" : "prima.jpg, dopo.jpg (e altre foto)"}. Intanto si vede il riquadro neutro.`, { line: r.line, code: r.code });
}
if (jpgs.length) add("warning", `${jpgs.length} foto ancora in JPG (${jpgs.slice(0, 3).join(", ")}${jpgs.length > 3 ? "…" : ""}): lancia npm run foto per convertirle in WebP leggere.`);

// ------------------------------------------------------------------ stampa
const where = (i) => [i.line ? `riga ${i.line}` : null, i.code].filter(Boolean).join(" · ");
const errors = issues.filter((i) => i.level === "error");
const warnings = issues.filter((i) => i.level === "warning");
const count = (kind, state) => rows.filter((r) => r.kind === kind && (!state || r.state === state)).length;

console.log(`\nCatalogo: ${relative(ROOT, CSV)} (righe senza errori)`);
console.log(`  Prodotti:    ${count("prodotto")} (${count("prodotto", "pubblicato")} pubblicati, ${count("prodotto", "bozza")} in bozza, ${count("prodotto", "esempio")} di esempio)`);
console.log(`  Trattamenti: ${count("trattamento")} (${count("trattamento", "pubblicato")} pubblicati, ${count("trattamento", "bozza")} in bozza, ${count("trattamento", "esempio")} di esempio)`);

if (errors.length) {
  console.log(`\n✗ ERRORI da sistemare (${errors.length}) — queste righe NON vanno online:`);
  for (const i of errors) console.log(`  - ${where(i) ? `[${where(i)}] ` : ""}${i.message}`);
}
if (warnings.length) {
  console.log(`\n! Avvisi (${warnings.length}) — non bloccano, ma conviene sistemarli:`);
  for (const i of warnings) console.log(`  - ${where(i) ? `[${where(i)}] ` : ""}${i.message}`);
}
console.log(errors.length ? `\n${errors.length} errori, ${warnings.length} avvisi.` : `\n✓ Nessun errore${warnings.length ? `, ${warnings.length} avvisi` : ""}.`);
process.exit(errors.length ? 1 : 0);
