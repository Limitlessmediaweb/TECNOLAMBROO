#!/usr/bin/env node
/**
 * Prova del tasto «Salta intro» della home (sito avviato, BASE=http://localhost:3311):
 * click a inizio, metà e fine percorso, Tab+Invio, Esc, visitatore di ritorno con «Rivedi intro»,
 * prefers-reduced-motion, telefono 390 px. Screenshot in test-output/skip-intro.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3311";
const OUT = join(process.cwd(), "test-output", "skip-intro");
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, info = "") => {
  if (!ok) fails++;
  console.log(`  ${ok ? "✓" : "✗"} ${name}${info ? `  (${info})` : ""}`);
};

const state = (page) =>
  page.evaluate(() => {
    const sj = document.querySelector(".sj");
    const b = document.querySelector(".sj-skipintro");
    const rp = document.querySelector(".sj-replay");
    const panels = [...document.querySelectorAll("[data-sj-panel]")].map((p) => Number(p.style.opacity || 0));
    return {
      y: Math.round(scrollY),
      end: Math.round(sj.offsetTop + sj.offsetHeight - innerHeight),
      skipVisible: getComputedStyle(b).visibility === "visible" && Number(getComputedStyle(b).opacity) > 0.9,
      replayVisible: getComputedStyle(rp).visibility === "visible" && Number(getComputedStyle(rp).opacity) > 0.9,
      css: `skip ${getComputedStyle(b).visibility}/${getComputedStyle(b).opacity} rivedi ${getComputedStyle(rp).visibility}/${getComputedStyle(rp).opacity} end ${sj.dataset.sjEnd ?? "-"} skipped ${sj.dataset.sjSkipped ?? "-"}`,
      half: panels.filter((o) => o > 0.02 && o < 0.98).length,
      last: panels[panels.length - 1],
      saved: localStorage.getItem("tl-intro-skip"),
      focus: document.activeElement?.tagName + "." + (document.activeElement?.className || ""),
      mode: sj.dataset.mode,
      hScroll: document.documentElement.scrollWidth > innerWidth,
    };
  });

async function open(ctx, { fresh = true } = {}) {
  const page = await ctx.newPage();
  await page.addInitScript((fresh) => {
    localStorage.setItem("tl-consent", JSON.stringify({ v: 1, stats: false, at: new Date().toISOString() }));
    if (fresh && !sessionStorage.getItem("kept")) localStorage.removeItem("tl-intro-skip");
    sessionStorage.setItem("kept", "1");
  }, fresh);
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForSelector('.sj[data-ready="1"]', { timeout: 90000 });
  await wait(800);
  return page;
}
async function toProgress(page, p) {
  await page.evaluate((p) => {
    const sj = document.querySelector(".sj");
    scrollTo({ top: (sj.offsetHeight - innerHeight) * p, behavior: "instant" });
  }, p);
  await wait(3500);
}

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
try {
  for (const [label, viewport] of [["desktop", { width: 1440, height: 900 }], ["telefono", { width: 390, height: 844 }]]) {
    console.log(`\n${label} ${viewport.width}px`);
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    let page = await open(ctx);
    let s = await state(page);
    check("tasto visibile all'inizio", s.skipVisible && !s.replayVisible, `mode ${s.mode}`);
    check("niente scroll orizzontale", !s.hScroll);
    await page.screenshot({ path: join(OUT, `${label}-inizio.png`) });

    // Tab: il primo elemento è il tasto, Invio salta
    await page.keyboard.press("Tab");
    s = await state(page);
    check("primo Tab sul tasto", s.focus.includes("sj-skipintro"), s.focus);
    await page.keyboard.press("Enter");
    await wait(3500);
    s = await state(page);
    check("Tab+Invio porta al finale", Math.abs(s.y - s.end) < 3 && s.half === 0 && s.last > 0.98, `y ${s.y}/${s.end}, a metà ${s.half}`);
    check("focus sul titolo finale", s.focus.startsWith("H2"), s.focus);
    check("scelta salvata", s.saved === "1");
    // con il rendering software (pochi frame al secondo) le dissolvenze dei tasti finiscono tardi
    await page
      .waitForFunction(() => getComputedStyle(document.querySelector(".sj-replay")).opacity === "1" && getComputedStyle(document.querySelector(".sj-skipintro")).opacity === "0", null, { timeout: 10000 })
      .catch(() => {});
    s = await state(page);
    check("«Rivedi intro» visibile, tasto nascosto", s.replayVisible && !s.skipVisible, s.css);
    await page.screenshot({ path: join(OUT, `${label}-dopo-salto.png`) });

    // Rivedi intro
    await page.click(".sj-replay");
    await wait(3500);
    await page
      .waitForFunction(() => getComputedStyle(document.querySelector(".sj-skipintro")).opacity === "1", null, { timeout: 10000 })
      .catch(() => {});
    s = await state(page);
    check("«Rivedi intro» torna all'inizio", s.y === 0 && s.skipVisible && s.saved === null, `y ${s.y}, ${s.css}`);

    // click a metà e quasi alla fine
    for (const p of [0.5, 0.93]) {
      await toProgress(page, p);
      s = await state(page);
      check(`tasto visibile al ${p * 100}%`, s.skipVisible);
      await page.click(".sj-skipintro");
      await wait(3500);
      s = await state(page);
      check(`click al ${p * 100}% → finale senza animazioni a metà`, Math.abs(s.y - s.end) < 3 && s.half === 0 && s.last > 0.98, `y ${s.y}/${s.end}, a metà ${s.half}`);
      await page.click(".sj-replay");
      await wait(3500);
    }

    // Esc
    await toProgress(page, 0.2);
    await page.keyboard.press("Escape");
    await wait(3500);
    s = await state(page);
    check("Esc salta l'intro", Math.abs(s.y - s.end) < 3 && s.half === 0, `y ${s.y}/${s.end}`);

    // visitatore di ritorno: ricarica dall'alto
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.reload({ waitUntil: "load", timeout: 120000 });
    await page.waitForSelector('.sj[data-ready="1"]', { timeout: 90000 });
    await wait(1500);
    s = await state(page);
    check("ritorno: parte dopo il percorso con «Rivedi intro»", Math.abs(s.y - s.end) < 3 && s.replayVisible && s.half === 0, `y ${s.y}/${s.end}`);
    await page.screenshot({ path: join(OUT, `${label}-ritorno.png`) });
    await ctx.close();
  }

  console.log("\nprefers-reduced-motion");
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await open(ctx);
  const s = await state(page);
  check("percorso già saltato", s.mode === "calm" && Math.abs(s.y - s.end) < 3 && s.replayVisible && !s.skipVisible, `mode ${s.mode}, y ${s.y}/${s.end}`);
  await page.screenshot({ path: join(OUT, "ridotto.png"), timeout: 120000 });
  await ctx.close();

  // menu: «Configura» porta al configuratore
  const c2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p2 = await c2.newPage();
  await p2.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const hrefs = await p2.$$eval("header nav a", (as) => as.map((a) => a.getAttribute("href")));
  check("menu: Prodotti e Configura vanno alle loro pagine", hrefs.includes("/prodotti") && hrefs.includes("/configuratore"), hrefs.join(" "));
  await c2.close();
} catch (e) {
  fails++;
  console.error("  ✗", String(e).slice(0, 400));
} finally {
  await browser.close();
}
console.log(fails ? `\n${fails} controlli falliti` : "\ntutto ok");
process.exit(fails ? 1 : 0);
