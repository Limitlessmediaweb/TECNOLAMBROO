#!/usr/bin/env node
/**
 * Verifica del sito finale (sito avviato, BASE=http://localhost:3320), a 390 px e 1440 px:
 * - intro animata + «Salta» (e niente intro al ritorno);
 * - percorso «Segui il segnale» + «Salta intro» / «Rivedi intro»;
 * - tutte le pagine del menu, senza segnaposto visibili;
 * - redirect 301 delle pagine tolte;
 * - configuratore: «Hai un disegno? Caricalo» con un file;
 * - modulo preventivo con allegato (l'invio a /api/quote è simulato: nessuna email parte).
 * Screenshot in test-output/sito-finale/.  Uso: BASE=http://localhost:3320 node scripts/sito-finale-e2e.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3320";
const OUT = join(process.cwd(), "test-output", "sito-finale");
mkdirSync(OUT, { recursive: true });

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error("  ✗", msg);
};
const ok = (msg) => console.log("  ✓", msg);
const check = (cond, msg) => (cond ? ok(msg) : fail(msg));

const PAGES = ["/prodotti", "/configuratore", "/su-misura", "/azienda", "/contatti"];
const FORBIDDEN = /DA COMPLETARE|DA CONFERMARE|ESEMPIO|Spinner|SPINNER|TO BE COMPLETED/;
const REDIRECTS = [
  ["/shop", "/configuratore"],
  ["/catalogo", "/prodotti"],
  ["/trattamenti", "/azienda#finiture"],
  ["/prodotti/tabelle", "/prodotti#tabelle"],
  ["/qualita", "/azienda#qualita"],
  ["/faq", "/contatti#faq"],
];
const VIEWPORTS = [
  { name: "390", width: 390, height: 844, mobile: true },
  { name: "1440", width: 1440, height: 900, mobile: false },
];
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  console.log(`\n— ${vp.name} px`);
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.mobile, hasTouch: vp.mobile, reducedMotion: "no-preference" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const shot = (name, full = false) => page.screenshot({ path: join(OUT, `${vp.name}-${name}.png`), fullPage: full });

  // 1) intro + Salta
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const intro = page.locator(".intro-overlay");
  await intro.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  check(await intro.isVisible(), "l'intro animata parte alla prima visita");
  await page.waitForFunction(() => window.getComputedStyle(document.querySelector(".intro-overlay button")).visibility === "visible", null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(900);
  await shot("01-intro");
  await intro.locator("button").click({ timeout: 4000 });
  await page.waitForTimeout(800);
  check(!(await intro.isVisible().catch(() => false)), "«Salta» chiude l'intro");
  check((await page.evaluate(() => localStorage.getItem("tl-intro-seen"))) === "1", "intro segnata come vista");
  await shot("02-hero");

  // 2) percorso: Salta intro / Rivedi intro
  const skipIntro = page.locator(".sj-skipintro");
  check(await skipIntro.isVisible(), "«Salta intro» visibile nel percorso");
  await skipIntro.click();
  await page.waitForTimeout(1500);
  check(await page.getByRole("button", { name: /Rivedi intro/i }).first().isVisible().catch(() => false), "dopo «Salta intro» compare «Rivedi intro»");
  await shot("03-dopo-percorso");
  await page.locator("#dopo-il-percorso").scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await shot("04-home-sezioni");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  check(!(await page.locator(".intro-overlay").isVisible().catch(() => false)), "al ritorno l'intro non riparte");

  // 3) pagine del menu
  for (const p of PAGES) {
    const res = await page.goto(BASE + p, { waitUntil: "load" });
    await page.waitForTimeout(600);
    check(res?.status() === 200, `${p} risponde 200`);
    const text = await page.locator("body").innerText();
    const bad = text.match(FORBIDDEN);
    check(!bad, `${p} senza segnaposto o «Spinner»${bad ? ` (trovato: ${bad[0]})` : ""}`);
    await shot(`10-${p.slice(1)}`, true);
  }

  // 4) redirect delle pagine tolte (solo una volta)
  if (vp.name === "1440") {
    for (const [from, to] of REDIRECTS) {
      const r = await page.request.get(BASE + from, { maxRedirects: 0 });
      const loc = r.headers()["location"] ?? "";
      check(r.status() === 301 && loc.replace(BASE, "") === to, `${from} → 301 ${to} (ricevuto ${r.status()} ${loc})`);
    }
  }

  // 5) configuratore: carica un disegno
  await page.goto(BASE + "/configuratore#disegno", { waitUntil: "load" });
  const box = page.locator("#disegno");
  await box.scrollIntoViewIfNeeded();
  await box.locator("textarea").first().fill("Curva piano H 90°, flange UBR100, lato 200 mm (test)");
  await box.locator('input[type="file"]').first().setInputFiles({ name: "disegno-test.pdf", mimeType: "application/pdf", buffer: PDF });
  await page.waitForTimeout(300);
  check(await box.getByText("disegno-test.pdf").first().isVisible(), "file del disegno allegato");
  await box.getByRole("button", { name: /Aggiungi/i }).first().click();
  await page.waitForTimeout(600);
  check(await box.getByRole("link", { name: /richiesta/i }).first().isVisible(), "pezzo su disegno aggiunto alla richiesta");
  await shot("20-configuratore-disegno");

  // 6) modulo preventivo con allegato (invio simulato)
  let posted = null;
  await page.route("**/api/quote", async (route) => {
    posted = route.request().postData() ?? "";
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, number: "TEST-0001" }) });
  });
  await page.goto(BASE + "/contatti", { waitUntil: "load" });
  const form = page.locator("#preventivo form").first();
  await form.locator('input[name="name"]').fill("Prova Test");
  await form.locator('input[name="email"]').fill("test@example.com");
  await form.locator('[name="message"]').fill("Twistabile WR-90, 600 mm, flange UBR100. Test automatico.");
  await form.locator('input[type="file"]').first().setInputFiles({ name: "disegno-test.pdf", mimeType: "application/pdf", buffer: PDF });
  await form.locator('input[type="checkbox"]').first().check();
  await shot("30-preventivo-compilato");
  await form.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/shop\/richiesta\/inviata/, { timeout: 15000 }).catch(() => {});
  check(posted !== null && posted.includes("disegno-test.pdf"), "richiesta inviata con l'allegato");
  check(/\/shop\/richiesta\/inviata/.test(page.url()), "pagina di conferma dopo l'invio");
  await shot("31-preventivo-inviato");
  await page.unroute("**/api/quote");

  check(errors.length === 0, `nessun errore JavaScript${errors.length ? `: ${errors.slice(0, 3).join(" | ")}` : ""}`);
  await ctx.close();
}

await browser.close();
console.log(failures ? `\n${failures} controlli falliti` : "\nTutti i controlli superati");
process.exit(failures ? 1 : 0);
