#!/usr/bin/env node
/**
 * npm run foto: converte in WebP le foto JPG messe in public/foto/** (prodotti, officina, persone).
 *  - lato lungo al massimo 2400 px (le foto più piccole non vengono ingrandite), qualità 80;
 *  - stesso nome, estensione .webp (es. collaudo-1.jpg → collaudo-1.webp);
 *  - avviso se il lato lungo è sotto i 2000 px (foto troppo piccola per le pagine);
 *  - l'originale JPG viene spostato in foto-originali/ (stessa sottocartella), fuori da public/ e da git:
 *    altrimenti la galleria mostrerebbe la stessa foto due volte (JPG e WebP).
 * Si può rilanciare: le foto già convertite (nessun JPG rimasto) vengono saltate.
 * Opzioni: --dry (mostra cosa farebbe senza toccare i file).
 */
import { existsSync, mkdirSync, readdirSync, renameSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC = join(ROOT, "public", "foto");
const BACKUP = join(ROOT, "foto-originali");
const MAX = 2400;
const MIN_WARN = 2000;
const QUALITY = 80;
const DRY = process.argv.includes("--dry");

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.jpe?g$/i.test(name)) yield p;
  }
}

const files = [...walk(SRC)];
if (!files.length) {
  console.log("Nessun JPG in public/foto/: niente da convertire.");
  process.exit(0);
}

let converted = 0;
const small = [];
for (const file of files) {
  const rel = relative(SRC, file);
  const out = file.replace(/\.jpe?g$/i, ".webp");
  const meta = await sharp(file).metadata();
  // le foto dei telefoni salvano la rotazione nei metadati EXIF: .rotate() la applica
  const portrait = (meta.orientation ?? 1) >= 5;
  const w = portrait ? meta.height : meta.width;
  const h = portrait ? meta.width : meta.height;
  const long = Math.max(w ?? 0, h ?? 0);
  if (long < MIN_WARN) small.push(`${rel} (${w}×${h})`);
  if (existsSync(out)) console.log(`! ${rel}: esiste già ${relative(SRC, out)}, la sovrascrivo`);
  if (DRY) {
    console.log(`· ${rel} → ${relative(SRC, out)} (${w}×${h}${long > MAX ? `, ridotta a ${MAX} px` : ""})`);
    continue;
  }
  await sharp(file)
    .rotate()
    .resize({ width: MAX, height: MAX, fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(out);
  const backup = join(BACKUP, rel);
  mkdirSync(dirname(backup), { recursive: true });
  renameSync(file, backup);
  const after = await sharp(out).metadata();
  console.log(`✓ ${rel} → ${relative(SRC, out)} ${after.width}×${after.height}, ${Math.round(statSync(out).size / 1024)} KB`);
  converted++;
}

if (!DRY) console.log(`\n${converted} foto convertite. Originali in foto-originali/ (non vanno online e non sono in git).`);
if (small.length) {
  console.warn(`\n⚠ Lato lungo sotto i ${MIN_WARN} px (meglio rifare la foto o usarne una più grande):`);
  for (const s of small) console.warn(`  - ${s}`);
}
