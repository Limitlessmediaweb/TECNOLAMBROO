#!/usr/bin/env node
/**
 * Screenshot dei capitoli della home «Il viaggio del segnale» (1440 px e 390 px).
 * La scena si ferma su un avanzamento preciso con window.__sjSeek (0..1) e window.__sjTime (secondi).
 * Uso: BASE=http://localhost:3311 OUT=<cartella> node scripts/journey-shots.mjs [it|en] [solo=nome,nome]
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = (process.env.BASE ?? "http://localhost:3311").replace(/\/$/, "");
const OUT = process.env.OUT ?? join(process.cwd(), "screenshots", "home-premium");
const locale = process.argv[2] === "en" ? "en" : "it";
const only = (process.argv[3] ?? "").replace("solo=", "").split(",").filter(Boolean);
mkdirSync(OUT, { recursive: true });

export const FRAMES = [
  { name: "01-hero", p: 0, t: 1.3 },
  { name: "02-flangia", p: 0.145, t: 2.2 },
  { name: "03-guida-rigida", p: 0.25, t: 3.1 },
  { name: "04-curva", p: 0.375, t: 4.0 },
  { name: "05-twist", p: 0.545, t: 5.2 },
  { name: "06-flessibile", p: 0.715, t: 6.1 },
  { name: "06b-catena", p: 0.885, t: 7.4 },
  { name: "07-finale", p: 1, t: 9.0 },
];
const SIZES = [
  { w: 1440, h: 810, tag: "1440", frames: FRAMES.map((f) => f.name) },
  { w: 390, h: 844, tag: "390", frames: ["01-hero", "02-flangia", "04-curva", "05-twist", "06-flessibile", "06b-catena", "07-finale"] },
].filter((s) => !process.env.SIZE || s.tag === process.env.SIZE);

// GPU vera (ANGLE su Direct3D 11); con SOFT=1 il rendering software, molto più lento
const browser = await chromium.launch({ args: process.env.SOFT ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] : ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
for (const size of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: size.w < 600 ? 2 : 1, isMobile: size.w < 600, hasTouch: size.w < 600 });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("tl-consent", JSON.stringify({ v: 1, stats: false, at: new Date().toISOString() }));
    } catch {}
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("ERRORE PAGINA", e.message));
  page.on("console", (m) => m.type() === "error" && console.log("console:", m.text().slice(0, 200)));
  await page.goto(`${BASE}${locale === "en" ? "/en" : "/"}`, { waitUntil: "networkidle" });
  await page.waitForSelector("section.sj[data-ready]", { timeout: 60000 });
  for (const f of FRAMES) {
    if (!size.frames.includes(f.name) || (only.length && !only.includes(f.name))) continue;
    await page.evaluate(
      ({ p, t }) => {
        window.__sjSeek = p;
        window.__sjTime = t;
        window.__sjHold = false;
        const root = document.querySelector("section.sj");
        const span = root.offsetHeight - window.innerHeight;
        window.scrollTo(0, Math.round(span * p));
      },
      f,
    );
    // qualche fotogramma perché testi e scena arrivino a regime, poi la scena si ferma per lo scatto
    const from = await page.evaluate(() => window.__sjFrames ?? 0);
    await page.waitForFunction((n) => (window.__sjFrames ?? 0) >= n + 4, from, { timeout: 120000 });
    await page.waitForTimeout(700);
    await page.evaluate(() => (window.__sjHold = true));
    await page.waitForTimeout(120);
    const file = join(OUT, `${locale}-${size.tag}-${f.name}.png`);
    await page.screenshot({ path: file, timeout: 120000 });
    console.log(file);
  }
  await ctx.close();
}
await browser.close();
