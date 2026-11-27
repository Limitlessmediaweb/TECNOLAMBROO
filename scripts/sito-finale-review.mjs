#!/usr/bin/env node
/**
 * Revisione visiva automatica (sito avviato, BASE=http://localhost:3320): tutte le pagine del menu a
 * 390 px (telefono) e 1440 px, tema chiaro e scuro. Scorre la pagina fino in fondo (fa partire le
 * animazioni), poi segnala: immagini che non caricano, scroll orizzontale, elementi che escono dallo
 * schermo, bottoni andati a capo, testi tagliati, errori JavaScript e richieste fallite.
 * Screenshot interi in test-output/review/.  Uso: BASE=http://localhost:3320 node scripts/sito-finale-review.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3320";
const OUT = join(process.cwd(), "test-output", "review");
mkdirSync(OUT, { recursive: true });
const PAGES = (process.env.PAGES ?? "/,/prodotti,/configuratore,/su-misura,/azienda,/contatti,/shop/richiesta,/prodotti/guida-flessibile-twistabile").split(",");
const RUNS = [
  { name: "390", width: 390, height: 844, mobile: true, theme: "light" },
  { name: "390-dark", width: 390, height: 844, mobile: true, theme: "dark" },
  { name: "1440", width: 1440, height: 900, mobile: false, theme: "light" },
];
const only = process.env.RUNS?.split(",");

const report = [];
const browser = await chromium.launch();
for (const run of RUNS.filter((r) => !only || only.includes(r.name))) {
  const ctx = await browser.newContext({ viewport: { width: run.width, height: run.height }, isMobile: run.mobile, hasTouch: run.mobile, deviceScaleFactor: run.mobile ? 2 : 1 });
  await ctx.addInitScript((theme) => {
    localStorage.setItem("tl-intro-seen", "1");
    localStorage.setItem("tl-theme", theme);
    localStorage.setItem("tl-consent", JSON.stringify({ v: 1, stats: false, at: new Date().toISOString() }));
  }, run.theme);
  for (const path of PAGES) {
    const page = await ctx.newPage();
    const issues = [];
    page.on("pageerror", (e) => issues.push(`JS: ${e.message.slice(0, 160)}`));
    page.on("console", (m) => m.type() === "error" && issues.push(`console: ${m.text().slice(0, 160)}`));
    page.on("response", (r) => r.status() >= 400 && !r.url().includes("_vercel") && issues.push(`HTTP ${r.status()}: ${r.url().replace(BASE, "")}`));
    await page.goto(BASE + path, { waitUntil: "load", timeout: 90000 });
    // scorre tutta la pagina a passi per far partire reveal e lazy-load
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.7;
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 140));
      }
      window.scrollTo(0, document.documentElement.scrollHeight);
      await new Promise((r) => setTimeout(r, 900));
    });
    const found = await page.evaluate(() => {
      const out = [];
      const vw = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth > vw + 1) out.push(`scroll orizzontale: ${document.documentElement.scrollWidth}px su ${vw}px`);
      const label = (el) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${String(el.className).split(" ").slice(0, 3).join(".")} «${(el.textContent || el.getAttribute("alt") || "").trim().slice(0, 40)}»`;
      for (const img of document.querySelectorAll("img")) {
        if (img.loading === "lazy" && !img.complete) continue;
        if (img.complete && img.naturalWidth === 0) out.push(`immagine non caricata: ${img.currentSrc || img.src}`);
      }
      const visible = (el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0 && !el.closest("[hidden],dialog:not([open]),.sr-only,[aria-hidden='true']");
      };
      for (const el of document.querySelectorAll("main *, footer *, header *")) {
        if (!visible(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.right > vw + 2 && !el.closest(".data-table-wrap,[data-scroll-x],.overflow-x-auto,canvas")) {
          const s = getComputedStyle(el);
          if (s.position !== "fixed") out.push(`esce a destra di ${Math.round(r.right - vw)}px: ${label(el)}`);
        }
      }
      // righe reali di testo dentro il bottone (solo il testo visibile, non le icone né lo sr-only)
      const lines = (root) => {
        const tops = new Set();
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!n.textContent.trim() || !visible(n.parentElement)) continue;
          const range = document.createRange();
          range.selectNodeContents(n);
          for (const r of range.getClientRects()) if (r.width > 1) tops.add(Math.round(r.top / 4));
        }
        return tops.size;
      };
      for (const b of document.querySelectorAll("a.btn, button.btn, .sj-btn, button[type='submit']")) {
        if (!visible(b)) continue;
        const hasSub = b.querySelector("small, .annot, .sj-btn-sub, .sj-btn-note, span.block");
        if (lines(b) > (hasSub ? 2 : 1)) out.push(`bottone su più righe: ${label(b)}`);
      }
      for (const el of document.querySelectorAll("h1, h2, h3, p, a, button, dt, dd, li, figcaption")) {
        if (!visible(el)) continue;
        const s = getComputedStyle(el);
        if ((s.overflow === "hidden" || s.textOverflow === "ellipsis") && el.scrollWidth > el.clientWidth + 2 && !el.closest(".marquee")) out.push(`testo tagliato: ${label(el)}`);
      }
      // reveal rimasti invisibili dopo lo scroll
      for (const el of document.querySelectorAll("main [data-hx-reveal], main [data-reveal], main section")) {
        const s = getComputedStyle(el);
        if (parseFloat(s.opacity) < 0.05 && el.getBoundingClientRect().height > 40) out.push(`sezione rimasta invisibile: ${label(el)}`);
      }
      return [...new Set(out)];
    });
    issues.push(...found);
    const file = `${run.name}${path === "/" ? "-home" : path.replace(/\//g, "-")}.png`;
    await page.screenshot({ path: join(OUT, file), fullPage: true });
    report.push({ run: run.name, path, issues: [...new Set(issues)] });
    console.log(`${run.name} ${path}: ${issues.length ? "\n   - " + [...new Set(issues)].join("\n   - ") : "ok"}`);
    await page.close();
  }
  await ctx.close();
}
await browser.close();
writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
