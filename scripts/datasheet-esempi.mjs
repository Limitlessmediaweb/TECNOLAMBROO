#!/usr/bin/env node
/**
 * Datasheet PDF di esempio dal configuratore premium (sito avviato, BASE=http://localhost:3211):
 * apre tre configurazioni dal link condivisibile, preme "Scarica datasheet" e salva i PDF.
 * Uso: node scripts/datasheet-esempi.mjs [cartella di uscita]   (predefinita: test-output/datasheet)
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3211";
const OUT = process.argv[2] ?? join(process.cwd(), "test-output", "datasheet");
mkdirSync(OUT, { recursive: true });

const CASES = [
  // flessibile twistabile a catalogo: dati elettrici dal datasheet TFTG
  "tipo=twistabile&wr=90&l=600&f1=UBR100&f2=PBR100&fin=argentata&guaina=si",
  // curva a 90° a catalogo: perdita e VSWR dal datasheet TCE
  "tipo=curva&piano=E&wr=28&ang=90&l1=60&l2=60&f1=PBR320&f2=PBR320&fin=brillantata",
  // curva fuori catalogo: dati elettrici "su richiesta"
  "tipo=curva&piano=H&wr=62&ang=45&l1=100&l2=200&f1=UBR140&f2=UBR140&fin=surtec650",
];

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
let failures = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await page.addInitScript(() => localStorage.setItem("tl-consent", JSON.stringify({ v: 1, stats: false, at: new Date().toISOString() })));
  for (const q of CASES) {
    await page.goto(`${BASE}/configuratore?${q}`, { waitUntil: "networkidle" });
    await page.waitForSelector('.p3d-stage[data-stage-state="ready"]', { timeout: 90000 });
    await page.waitForTimeout(1500);
    const [download] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.click("[data-datasheet]")]);
    const file = join(OUT, download.suggestedFilename());
    await download.saveAs(file);
    console.log("  ✓", file);
  }
} catch (e) {
  failures++;
  console.error("  ✗", String(e).slice(0, 300));
} finally {
  await browser.close();
}
process.exit(failures ? 1 : 0);
