#!/usr/bin/env node
/**
 * Video dello scroll della home «Il viaggio del segnale»: 1920×1080, 30 fps, mp4.
 * Playwright cattura un fotogramma alla volta (scena ferma su window.__sjSeek / __sjTime, quindi
 * il video è fluido anche su un PC lento), ffmpeg li monta.
 * Uso: BASE=http://localhost:3313 OUT=<cartella> node scripts/journey-video.mjs [it|en] [secondi]
 */
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const BASE = (process.env.BASE ?? "http://localhost:3313").replace(/\/$/, "");
const OUT = process.env.OUT ?? join(process.cwd(), "screenshots", "home-premium");
const locale = process.argv[2] === "en" ? "en" : "it";
const SECONDS = Number(process.argv[3] ?? 28);
const FPS = 30;
const TOTAL = SECONDS * FPS;
const frames = join(OUT, `_frames-${locale}`);
rmSync(frames, { recursive: true, force: true });
mkdirSync(frames, { recursive: true });

/** Avanzamento dello scroll nel tempo: fermo all'inizio e alla fine, in mezzo quasi costante */
function progress(sec) {
  const hold = 1.4;
  const x = Math.min(1, Math.max(0, (sec - hold) / (SECONDS - 2 * hold - 0.6)));
  const smooth = x * x * (3 - 2 * x);
  return 0.72 * x + 0.28 * smooth;
}

const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("tl-consent", JSON.stringify({ v: 1, stats: false, at: new Date().toISOString() }));
  } catch {}
});
const page = await ctx.newPage();
await page.goto(`${BASE}${locale === "en" ? "/en" : "/"}`, { waitUntil: "networkidle" });
await page.waitForSelector("section.sj[data-ready]", { timeout: 60000 });
// niente transizioni CSS durante la cattura: ogni fotogramma è lo stato esatto di quell'istante
await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation-play-state:paused!important}[data-whatsapp-float]{display:none!important}" });

for (let i = 0; i < TOTAL; i++) {
  const sec = i / FPS;
  const from = await page.evaluate(
    ({ p, t }) => {
      window.__sjSeek = p;
      window.__sjTime = t;
      window.__sjHold = false;
      const root = document.querySelector("section.sj");
      window.scrollTo(0, Math.round((root.offsetHeight - window.innerHeight) * p));
      return window.__sjFrames ?? 0;
    },
    { p: progress(sec), t: sec },
  );
  await page.waitForFunction((n) => (window.__sjFrames ?? 0) >= n + 2, from, { timeout: 60000 });
  await page.evaluate(() => (window.__sjHold = true));
  await page.screenshot({ path: join(frames, `f${String(i).padStart(5, "0")}.jpg`), type: "jpeg", quality: 93 });
  if (i % 90 === 0) console.log(`${i}/${TOTAL}`);
}
await browser.close();

const mp4 = join(OUT, `viaggio-del-segnale-${locale}-1920x1080.mp4`);
const r = spawnSync("ffmpeg", ["-y", "-framerate", String(FPS), "-i", join(frames, "f%05d.jpg"), "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-r", String(FPS), mp4], { stdio: "inherit" });
if (r.status === 0) rmSync(frames, { recursive: true, force: true });
console.log(r.status === 0 ? mp4 : "ffmpeg non riuscito: i fotogrammi restano in " + frames);
process.exit(r.status ?? 1);
