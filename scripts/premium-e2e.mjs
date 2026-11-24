#!/usr/bin/env node
/**
 * Verifica del configuratore 3D premium (sito avviato, BASE=http://localhost:3211):
 * - i 7 passi si percorrono fino ad "Aggiungi alla richiesta" e il pezzo entra nella richiesta;
 * - ogni tipo di pezzo costruisce il modello 3D senza errori in console, entro 60.000 triangoli;
 * - si possono scegliere solo le flange della misura; la seamless non si fa in WR-34;
 * - vista esplosa e schermata per ogni tipo in test-output/premium/.
 * Uso: npm run test:premium
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3211";
const OUT = join(process.cwd(), "test-output", "premium");
mkdirSync(OUT, { recursive: true });

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error("  ✗", msg);
};
const ok = (msg) => console.log("  ✓", msg);
const check = (cond, msg) => (cond ? ok(msg) : fail(msg));

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

const ready = () => page.waitForSelector('.p3d-stage[data-stage-state="ready"]', { timeout: 60000 });
const triangles = async () => Number(await page.getAttribute(".p3d-stage", "data-triangles"));
const step = () => page.getAttribute("[data-premium-configurator]", "data-step");
const next = () => page.click("[data-next]");
// schermata del solo palco 3D (senza aspettare che la pagina sia ferma: il modello ruota)
const shot = async (path) => page.screenshot({ path, clip: await page.locator(".p3d-stage").boundingBox(), animations: "disabled" });

try {
console.log("Percorso dei 7 passi");
await page.addInitScript(() => localStorage.setItem("tl-consent", JSON.stringify({ v: 1, stats: false, at: new Date().toISOString() })));
await page.goto(`${BASE}/configuratore`, { waitUntil: "networkidle" });
await ready();
check((await step()) === "type", "si parte dal passo Tipo");

const TILES = ["twistable", "seamless", "bendE", "bendH", "twist", "offset"];
for (const tile of TILES) {
  await page.click(`[data-tile="${tile}"]`, { force: true });
  await page.waitForTimeout(700);
  const n = await triangles();
  check(n > 500 && n <= 60000, `${tile}: modello 3D con ${n} triangoli`);
  await shot(join(OUT, `${tile}.png`));
}

// seamless: WR-34 non selezionabile
await page.click('[data-tile="seamless"]', { force: true });
await next();
check(await page.isDisabled('[data-size="WR-34"]'), "seamless: WR-34 non si può scegliere");
await page.click('[data-step-tab="type"]');
await page.click('[data-tile="twistable"]', { force: true });
await next();
check((await step()) === "size", "passo Misura WR");
await page.click('[data-size="WR-28"]', { force: true });
await next();
check((await step()) === "flange1", "passo Flangia 1");
const ids = await page.$$eval("[data-flange]", (els) => els.map((e) => e.getAttribute("data-flange")));
check(ids.includes("UG-599") && ids.includes("UBR320") && !ids.includes("UBR100"), `WR-28: solo le sue flange (${ids.join(", ")})`);
await page.click('[data-flange="CBR320"]', { force: true });
await page.waitForTimeout(1200);
check((await page.textContent(".p3d-tag span")) !== null, "etichetta della flangia nel 3D");
const tags = await page.$$eval(".p3d-tag:not(.p3d-tag-part)", (els) => els.map((e) => e.textContent));
check(tags.some((t) => /FLANGIA 1.*IEC-CBR 320/.test(t)) && tags.some((t) => /FLANGIA 2.*IEC-CBR 320/.test(t)), `etichette: ${tags.join(" | ")}`);
await shot(join(OUT, "flangia-choke.png"));
await next();
check((await step()) === "flange2", "passo Flangia 2");
check(await page.isChecked("[data-same-flange]"), "Flangia 2 uguale alla 1 già spuntato");
await page.uncheck("[data-same-flange]");
await page.click('[data-flange="PBR320"]', { force: true });
await next();
check((await step()) === "length", "passo Lunghezza");
await page.click('[data-length="900"]');
await page.waitForTimeout(600);
const dim = await page.$$eval(".part3d-dim", (els) => els.map((e) => e.textContent));
check(dim.some((t) => /L = 900 mm/.test(t)), `quota nel 3D: ${dim.join(" | ")}`);
await next();
check((await step()) === "finish", "passo Finitura");
for (const f of ["silver", "painted", "surtec", "raw", "bright"]) await page.click(`[data-finish="${f}"]`, { force: true });
await page.click('[data-finish="silver"]', { force: true });
await page.click('[data-jacket="on"]');
await page.click("[data-explode]");
await page.waitForTimeout(1500);
await shot(join(OUT, "esploso.png"));
await page.click("[data-explode]");
await next();
check((await step()) === "final", "passo Quantità");
await page.fill('[data-field="qty"]', "25");
const code = await page.textContent("[data-part-code]");
check(/TLFX-320 · TWIST · L900 · CBR320\/PBR320/.test(code ?? ""), `riferimento: ${code}`);
await page.click("[data-add-premium]");
await page.waitForSelector("[data-added]");
const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("tl-request-v1") ?? "[]"));
check(stored.length === 1 && stored[0].qty === 25 && stored[0].spec.finish === "silver" && stored[0].spec.jacket === 1, "pezzo nella richiesta con quantità, finitura e guaina");
const html = await page.content();
check(!/€|EUR\b/.test(html.replace(/<script[\s\S]*?<\/script>/g, "")), "nessun prezzo nella pagina");

console.log("Telefono");
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/configuratore?tipo=curva&piano=H&wr=90&ang=90&l1=100&l2=100&f1=UBR100&f2=CPR90G&fin=brillantata`, { waitUntil: "networkidle" });
await ready();
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check(overflow <= 1, `nessuno scorrimento orizzontale a 390 px (${overflow})`);
await page.screenshot({ path: join(OUT, "telefono.png") });

} catch (e) {
  fail(`interrotto: ${String(e).slice(0, 200)}`);
}
check(errors.length === 0, `nessun errore in console${errors.length ? `: ${errors.slice(0, 3).join(" · ")}` : ""}`);
await browser.close();
console.log(failures ? `\n${failures} problemi` : "\nTutto a posto");
process.exit(failures ? 1 : 0);
