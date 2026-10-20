#!/usr/bin/env node
/**
 * Catalogo e trattamenti sulla build di produzione (catalogo/catalogo.csv).
 * Avvio del sito:  npx next start --port 3211
 * Poi:            BASE=http://localhost:3211 npm run test:catalog
 *
 * 1. Online le righe ESEMPIO e bozza non esistono: le loro schede rispondono 404; /catalogo esiste
 *    solo se c'è almeno un prodotto pubblicato (e allora compare nel menu).
 * 2. /trattamenti elenca i trattamenti pubblicati; la ricerca filtra e resta nell'indirizzo (?q=).
 * 3. Scheda trattamento: titolo, riquadro foto, link "Richiedi informazioni" con ?codice=.
 * 4. Il link apre il modulo contatti con il codice nel messaggio.
 * 5. Telefono (375 px): nessuno scorrimento orizzontale su elenco e scheda.
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readCatalog } from "../src/lib/catalog/schema.ts";

const BASE = (process.env.BASE ?? "http://localhost:3211").replace(/\/$/, "");
const { rows } = readCatalog(readFileSync(join(process.cwd(), "catalogo", "catalogo.csv")));
const published = rows.filter((r) => r.state === "pubblicato");
const hidden = rows.filter((r) => r.state !== "pubblicato");
const treatments = published.filter((r) => r.kind === "trattamento");
const products = published.filter((r) => r.kind === "prodotto");

let failures = 0;
const check = (cond, msg) => {
  if (cond) console.log("  ✓", msg);
  else {
    failures++;
    console.error("  ✗", msg);
  }
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
await ctx.addInitScript(() => {
  sessionStorage.setItem("tl-intro-seen", "1");
  localStorage.setItem("tl-consent", JSON.stringify({ v: 1, stats: false, at: new Date().toISOString() }));
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

/* ------------------------------------------------------------- 1. righe non pubblicate */
console.log("\n1. Bozze ed ESEMPIO non sono online");
for (const r of hidden) {
  const path = r.kind === "prodotto" ? `/catalogo/${r.slug}` : `/trattamenti/${r.slug}`;
  const res = await page.goto(BASE + path);
  check(res?.status() === 404, `${path} (${r.state}) risponde 404`);
}
const cat = await page.goto(`${BASE}/catalogo`);
check(products.length ? cat?.status() === 200 : cat?.status() === 404, `/catalogo: ${products.length} prodotti pubblicati → ${cat?.status()}`);
await page.goto(BASE + "/", { waitUntil: "networkidle" });
const menuHasCatalog = await page.locator('footer a[href="/catalogo"]').count();
check(Boolean(menuHasCatalog) === Boolean(products.length), `Catalogo nel footer solo con prodotti pubblicati (${menuHasCatalog ? "c'è" : "non c'è"})`);

/* ------------------------------------------------------------- 2. elenco trattamenti */
console.log("\n2. Elenco trattamenti, ricerca");
await page.goto(`${BASE}/trattamenti`, { waitUntil: "networkidle" });
const listed = await page.locator("[data-catalog-item]").evaluateAll((els) => els.map((e) => e.dataset.catalogItem));
check(listed.length === treatments.length && treatments.every((t) => listed.includes(t.code)), `${listed.length} trattamenti in elenco: ${listed.join(", ")}`);
const first = treatments[0];
if (first) {
  const word = (first.name.it ?? "").slice(0, 5);
  await page.locator('input[type="search"]').fill(word);
  await page.waitForTimeout(200);
  const after = await page.locator("[data-catalog-item]").count();
  check(after >= 1 && after <= listed.length, `ricerca “${word}”: ${after} risultati`);
  check(new URL(page.url()).searchParams.get("q") === word, "la ricerca resta nell'indirizzo (?q=)");
  await page.goto(`${BASE}/trattamenti?q=${encodeURIComponent(word)}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  check((await page.locator('input[type="search"]').inputValue()) === word, "aprendo il link con ?q= la ricerca è già impostata");
  await page.locator('input[type="search"]').fill("zzzz-nessuno");
  check(await page.getByRole("button", { name: /Azzera i filtri/ }).isVisible(), "nessun risultato: messaggio e pulsante per azzerare");
}

/* ------------------------------------------------------------- 3-4. scheda e richiesta */
if (first) {
  console.log(`\n3. Scheda ${first.code}`);
  await page.goto(`${BASE}/trattamenti/${first.slug}`, { waitUntil: "networkidle" });
  check((await page.locator("h1").textContent())?.trim() === first.name.it, `titolo: ${first.name.it}`);
  check((await page.locator("[data-catalog-gallery] [data-photo-empty], [data-catalog-gallery] img").count()) >= 1, "foto o riquadro neutro");
  const link = page.locator(`a[href*="codice=${first.code}"]`);
  check((await link.count()) === 1, `link “Richiedi informazioni” con ?codice=${first.code}`);
  console.log("\n4. Modulo contatti precompilato");
  await link.click();
  await page.waitForURL(/\/contatti\?codice=/);
  await page.locator(`[data-catalog-prefilled="${first.code}"]`).waitFor({ timeout: 5000 }).catch(() => {});
  const msg = await page.locator('textarea[name="message"]').inputValue();
  check(msg.includes(first.code), `messaggio: “${msg}”`);
}

/* ------------------------------------------------------------- 5. telefono */
console.log("\n5. Telefono (375 px)");
const mob = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await mob.addInitScript(() => {
  sessionStorage.setItem("tl-intro-seen", "1");
  localStorage.setItem("tl-consent", JSON.stringify({ v: 1, stats: false, at: new Date().toISOString() }));
});
const mp = await mob.newPage();
for (const path of ["/trattamenti", "/en/treatments", ...(first ? [`/trattamenti/${first.slug}`, `/de/oberflaechenbehandlungen/${first.slug}`] : []), ...(products.length ? ["/catalogo"] : [])]) {
  await mp.goto(BASE + path, { waitUntil: "networkidle" });
  const over = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(over <= 0, `${path}: nessuno scorrimento orizzontale${over > 0 ? ` (+${over} px)` : ""}`);
}
await mob.close();

check(!errors.length, `nessun errore JavaScript${errors.length ? `: ${errors.join(" | ")}` : ""}`);
await browser.close();
console.log(failures ? `\n${failures} controlli falliti` : "\nTutti i controlli superati");
process.exit(failures ? 1 : 0);
