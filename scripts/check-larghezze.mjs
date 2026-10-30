#!/usr/bin/env node
/**
 * Pagine principali a 375, 390, 414, 430 px (telefono) e 1440 px (desktop): scorrimento orizzontale,
 * elementi che escono dallo schermo, errori JavaScript e risorse 404. Screenshot in screenshots/larghezze/.
 * Uso: build di produzione avviata, poi BASE=http://localhost:3211 node scripts/check-larghezze.mjs [percorsi…]
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = (process.env.BASE ?? "http://localhost:3211").replace(/\/$/, "");
const PATHS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["/", "/prodotti", "/prodotti/guida-flessibile-twistabile", "/prodotti/guida-flessibile-seamless", "/prodotti/curve", "/prodotti/twist", "/prodotti/disassati", "/prodotti/tabelle", "/prodotti/guida-flessibile/wr-90", "/trattamenti", "/trattamenti/galvanici", "/shop", "/shop/richiesta", "/su-misura", "/azienda", "/qualita", "/faq", "/contatti", "/privacy", "/cookie", "/termini", "/en", "/en/contact"];
const WIDTHS = [375, 390, 414, 430, 1440];
const OUT = join(process.cwd(), "screenshots", "larghezze");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
let problemi = 0;
for (const w of WIDTHS) {
  const mobile = w < 768;
  const ctx = await browser.newContext({ viewport: { width: w, height: mobile ? 860 : 900 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  // banner cookie già chiuso, come per chi ha scelto
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("tl-consent", JSON.stringify({ v: 1, stats: false, at: new Date().toISOString() }));
    } catch {}
  });
  const page = await ctx.newPage();
  for (const path of PATHS) {
    const errori = [];
    const onErr = (e) => errori.push(`JS: ${e.message.slice(0, 120)}`);
    const onResp = (r) => r.status() === 404 && errori.push(`404: ${r.url().replace(BASE, "")}`);
    page.on("pageerror", onErr);
    page.on("response", onResp);
    const res = await page.goto(BASE + path, { waitUntil: "networkidle" }).catch((e) => ({ status: () => `errore ${e.message}` }));
    if (res.status() !== 200) errori.push(`stato ${res.status()}`);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(300);
    const fuori = await page.evaluate(() => {
      const vw = window.visualViewport?.width ?? window.innerWidth;
      const out = [];
      if (document.documentElement.scrollWidth > vw + 1) out.push(`pagina larga ${document.documentElement.scrollWidth}px`);
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (!r.width || r.right <= vw + 1) continue;
        const st = getComputedStyle(el);
        if (st.visibility === "hidden" || st.display === "none" || el.closest("[aria-hidden=true],.sr-only,[data-overflow-ok]")) continue;
        // dentro un contenitore che scorre in orizzontale (tabelle, caroselli) va bene
        let p = el.parentElement, scorre = false;
        while (p && p !== document.body) {
          const o = getComputedStyle(p).overflowX;
          if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") { scorre = true; break; }
          p = p.parentElement;
        }
        if (!scorre) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} esce di ${Math.round(r.right - vw)}px`);
        if (out.length > 4) break;
      }
      return out;
    });
    errori.push(...fuori);
    const nome = `${w}-${path.replace(/\//g, "_") || "_home"}`.replace(/^(\d+)-$/, "$1-_home");
    if (path === "/" || path === "/shop" || path === "/contatti" || path === "/prodotti/guida-flessibile-twistabile") {
      await page.screenshot({ path: join(OUT, `${nome}.png`), fullPage: false });
    }
    page.off("pageerror", onErr);
    page.off("response", onResp);
    if (errori.length) {
      problemi++;
      console.log(`✗ ${w}px ${path}\n    ${[...new Set(errori)].join("\n    ")}`);
    }
  }
  console.log(`${w}px: ${PATHS.length} pagine controllate`);
  await ctx.close();
}
await browser.close();
console.log(problemi ? `\n${problemi} pagine con problemi` : "\n✓ Nessun problema a 375–430 px e 1440 px");
process.exit(problemi ? 1 : 0);
