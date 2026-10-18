#!/usr/bin/env node
/**
 * Banner del consenso (provvedimento del Garante dell'8/10/2021).
 * Avvio del sito:  npx next start --port 3211
 * Poi:            BASE=http://localhost:3211 npm run test:consent
 *
 * 1. Prima visita da un link di campagna: banner visibile, nessun cookie, nessuna provenienza salvata,
 *    nessuna statistica caricata, pulsante WhatsApp nascosto, "Accetta" e "Rifiuta" dello stesso peso.
 * 2. Rifiuta: banner chiuso, scelta ricordata alla visita successiva.
 * 3. "Preferenze cookie" nel footer riapre il banner; Accetta: provenienza salvata.
 * 4. X = rifiuto: la provenienza salvata si cancella.
 * 5. Scelta scaduta (oltre 6 mesi) o di una versione precedente: il banner ricompare.
 * 6. Telefono (375 px) e lingue: il banner sta nello schermo, pulsanti da almeno 44 px, link alla cookie policy.
 */
import { chromium } from "playwright";

const BASE = (process.env.BASE ?? "http://localhost:3211").replace(/\/$/, "");
const STATS = /\/_vercel\/insights|plausible\.io/;

let failures = 0;
const check = (cond, msg) => {
  if (cond) console.log("  ✓", msg);
  else {
    failures++;
    console.error("  ✗", msg);
  }
};

const browser = await chromium.launch();
const errors = [];
const stats = [];
async function newPage(ctx) {
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("request", (r) => STATS.test(r.url()) && stats.push(r.url()));
  return page;
}
const intro = () => sessionStorage.setItem("tl-intro-seen", "1");
const banner = (page) => page.locator("[data-consent-banner]");
const stored = (page, key) => page.evaluate((k) => localStorage.getItem(k), key);
const choice = async (page) => JSON.parse((await stored(page, "tl-consent")) ?? "null");

/* ------------------------------------------------------------- 1. prima visita */
console.log("\n1. Prima visita (link di campagna)");
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
await ctx.addInitScript(intro);
const page = await newPage(ctx);
await page.goto(`${BASE}/?utm_source=prova&utm_campaign=consenso`, { waitUntil: "networkidle" });
await banner(page).waitFor({ state: "visible", timeout: 5000 });
check(await banner(page).isVisible(), "banner visibile");
check((await stored(page, "tl-first-visit")) === null, "provenienza della campagna NON salvata prima del consenso");
check(stats.length === 0, "nessuna statistica caricata prima del consenso");
check((await ctx.cookies()).length === 0, "nessun cookie");
check((await page.evaluate(() => document.documentElement.dataset.consentOpen)) === "true", "html[data-consent-open] impostato");
const wa = page.locator("[data-whatsapp-float]");
if (await wa.count()) check((await wa.evaluate((el) => getComputedStyle(el).display)) === "none", "pulsante WhatsApp nascosto mentre il banner è aperto");
const acc = page.locator("[data-consent-accept]");
const rej = page.locator("[data-consent-reject]");
const [ba, br] = [await acc.boundingBox(), await rej.boundingBox()];
check(
  (await acc.getAttribute("class")) === (await rej.getAttribute("class")) && Math.abs(ba.height - br.height) < 1 && Math.abs(ba.width - br.width) < 24,
  "Accetta e Rifiuta con lo stesso stile e la stessa dimensione",
);
check(/\/cookie$/.test((await banner(page).locator("a").getAttribute("href")) ?? ""), "link alla cookie policy");

/* ------------------------------------------------------------- 2. rifiuta */
console.log("\n2. Rifiuta");
await rej.click();
check(!(await banner(page).count()), "banner chiuso");
const c1 = await choice(page);
check(c1?.v === 1 && c1.stats === false, "scelta salvata: rifiuto");
check((await stored(page, "tl-first-visit")) === null, "nessuna provenienza salvata");
await page.goto(`${BASE}/prodotti?utm_source=prova`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
check(!(await banner(page).count()), "alla pagina successiva il banner non ricompare");
check((await stored(page, "tl-first-visit")) === null, "con il rifiuto la provenienza resta non salvata");
check(stats.length === 0, "nessuna statistica caricata dopo il rifiuto");

/* ------------------------------------------------------------- 3. preferenze → accetta */
console.log("\n3. Preferenze cookie → Accetta");
await page.goto(`${BASE}/?utm_source=prova&utm_campaign=consenso`, { waitUntil: "networkidle" });
const pref = page.locator("footer [data-consent-preferences]");
check((await pref.count()) === 1, "link “Preferenze cookie” nel footer");
await pref.scrollIntoViewIfNeeded();
await pref.click();
await banner(page).waitFor({ state: "visible", timeout: 3000 });
check(await banner(page).isVisible(), "il banner si riapre");
await page.locator("[data-consent-accept]").click();
check((await choice(page))?.stats === true, "scelta salvata: consenso");
const fv = JSON.parse((await stored(page, "tl-first-visit")) ?? "null");
check(fv?.utm?.utm_source === "prova" && fv?.utm?.utm_campaign === "consenso", "con il consenso la provenienza viene salvata");
{ const ck = await ctx.cookies(); check(ck.length === 0, `ancora nessun cookie${ck.length ? `: ${ck.map((c) => c.name).join(", ")}` : ""}`); }

/* ------------------------------------------------------------- 4. X = rifiuto */
console.log("\n4. La X chiude senza accettare");
await pref.scrollIntoViewIfNeeded();
await pref.click();
await banner(page).waitFor({ state: "visible", timeout: 3000 });
await page.locator("[data-consent-close]").click();
check(!(await banner(page).count()), "banner chiuso");
check((await choice(page))?.stats === false, "la X vale come rifiuto");
check((await stored(page, "tl-first-visit")) === null, "revocando il consenso la provenienza salvata si cancella");

/* ------------------------------------------------------------- 5. scadenza e versione */
console.log("\n5. Scelta scaduta o di una versione precedente");
for (const [label, value] of [
  ["oltre 6 mesi fa", { v: 1, stats: true, at: new Date(Date.now() - 200 * 864e5).toISOString() }],
  ["versione precedente", { v: 0, stats: true, at: new Date().toISOString() }],
]) {
  await page.evaluate((v) => localStorage.setItem("tl-consent", JSON.stringify(v)), value);
  await page.reload({ waitUntil: "networkidle" });
  await banner(page).waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  check(await banner(page).isVisible(), `scelta ${label}: il banner ricompare`);
}
await ctx.close();

/* ------------------------------------------------------------- 6. telefono e lingue */
console.log("\n6. Telefono (375 px) e lingue");
const mob = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await mob.addInitScript(intro);
const mp = await newPage(mob);
for (const path of ["/", "/en", "/es", "/zh", "/de"]) {
  await mp.evaluate(() => localStorage.removeItem("tl-consent")).catch(() => {});
  await mp.goto(BASE + path, { waitUntil: "networkidle" });
  await banner(mp).waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  const box = await banner(mp).boundingBox();
  const btns = await mp.$$eval("[data-consent-banner] button", (els) => els.map((b) => ({ h: b.getBoundingClientRect().height, w: b.getBoundingClientRect().width, over: b.scrollWidth > b.clientWidth + 1 })));
  const href = await banner(mp).locator("a").getAttribute("href");
  const okBox = box && box.x >= 0 && box.x + box.width <= 375 && box.y >= 0 && box.y + box.height <= 812;
  const okBtns = btns.length === 3 && btns.every((b) => b.h >= 44 && b.w >= 44 && !b.over);
  check(okBox && okBtns && /cookies?$/.test(href ?? ""), `${path}: banner nello schermo (${box ? Math.round(box.height) : "?"} px), pulsanti ≥ 44 px senza testo tagliato, link ${href}`);
}
const mobCookies = await mob.cookies();
check(mobCookies.length === 0, `nessun cookie dopo 5 lingue${mobCookies.length ? `: ${mobCookies.map((c) => c.name).join(", ")}` : ""}`);
await mob.close();

check(stats.length === 0, `nessuna statistica caricata senza consenso${stats.length ? `: ${stats.join(" | ")}` : ""}`);
check(!errors.some((e) => !/Failed to load resource/.test(e)), `nessun errore JavaScript${errors.length ? `: ${errors.join(" | ")}` : ""}`);
await browser.close();
console.log(failures ? `\n${failures} controlli falliti` : "\nTutti i controlli superati");
process.exit(failures ? 1 : 0);
