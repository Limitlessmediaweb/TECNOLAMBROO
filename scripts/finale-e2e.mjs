#!/usr/bin/env node
/**
 * Prova completa del ramo premium-finale (sito avviato, BASE=http://localhost:3211), desktop 1440 e telefono 390:
 *  - home: percorso, «Salta intro», sezioni dopo il percorso (gamma, configuratore, perché, processo, CTA),
 *    niente scroll orizzontale, testi IT ed EN, ES/DE/ZH senza chiavi mancanti;
 *  - scroll con tastiera (PagGiù/Fine), rotella e swipe simulato (gesto touch di Chrome);
 *  - configuratore: flange uguali e diverse, transizione (TTG), terminazione (TR), download del datasheet PDF;
 *  - pagina contatti con il modulo preventivo a 390 px.
 * Schermate e PDF in test-output/finale/. Il flusso completo del preventivo è in scripts/request-e2e.mjs.
 * Uso: BASE=http://localhost:3211 node scripts/finale-e2e.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3211";
const OUT = join(process.cwd(), "test-output", "finale");
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, info = "") => {
  if (!ok) fails++;
  console.log(`  ${ok ? "✓" : "✗"} ${name}${info ? `  (${info})` : ""}`);
};

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const errors = [];

async function newPage(viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, acceptDownloads: true, isMobile: viewport.width < 500, hasTouch: viewport.width < 500, ...opts });
  await ctx.addInitScript(() => {
    localStorage.setItem("tl-consent", JSON.stringify({ v: 1, stats: false, at: new Date().toISOString() }));
    localStorage.removeItem("tl-intro-skip");
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${viewport.width}: ${e}`));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(`${viewport.width}: ${m.text()}`));
  return page;
}
const hScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const y = (page) => page.evaluate(() => Math.round(scrollY));

try {
  for (const [label, viewport] of [["desktop", { width: 1440, height: 900 }], ["telefono", { width: 390, height: 844 }]]) {
    console.log(`\n${label} ${viewport.width}px`);
    const page = await newPage(viewport);

    /* ---------- home */
    await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 120000 });
    await page.waitForSelector('.sj[data-ready="1"]', { timeout: 90000 }).catch(() => {});
    await wait(1200);
    check("home: niente scroll orizzontale", (await hScroll(page)) <= 0, `${await hScroll(page)} px`);
    await page.screenshot({ path: join(OUT, `${label}-home-inizio.png`), timeout: 120000 });

    // scroll con tastiera, rotella, swipe. Con il 3D in software (swiftshader) i frame sono lenti:
    // si aspetta che la posizione cambi (fino a 6 s) invece di misurare dopo un tempo fisso.
    const moved = async (from) => {
      for (let t = 0; t < 30; t++) {
        const now = await y(page);
        if (now > from) return now;
        await wait(200);
      }
      return y(page);
    };
    const y0 = await y(page);
    await page.keyboard.press("PageDown");
    const y1 = await moved(y0);
    check("tastiera PagGiù scorre", y1 > y0, `${y0} → ${y1}`);
    if (viewport.width >= 500) {
      await page.mouse.move(viewport.width / 2, viewport.height / 2);
      await page.mouse.wheel(0, 800);
      const y2 = await moved(y1);
      check("rotella scorre (anche sopra il 3D)", y2 > y1, `${y1} → ${y2}`);
    }
    // swipe: dito vero (eventi touch di Chrome) sul telefono, trascinamento della rotella su desktop
    const cdp = await page.context().newCDPSession(page);
    const ys = await y(page);
    if (viewport.width < 500) {
      const x = Math.round(viewport.width / 2);
      const y0t = Math.round(viewport.height * 0.8);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: y0t }] });
      for (let i = 1; i <= 10; i++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y0t - i * 40 }] });
        await wait(16);
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else {
      await page.mouse.wheel(0, 500);
    }
    const ye = await moved(ys);
    check(`swipe simulato (${viewport.width < 500 ? "touch" : "rotella"}) scorre`, ye > ys, `${ys} → ${ye}`);
    await page.keyboard.press("End");
    const yEnd = await moved(ye + 1000);
    check("tastiera Fine arriva in fondo", yEnd > ye + 1000, `${ye} → ${yEnd}`);

    // Salta intro: si torna in cima e si aspetta che la posizione sia ferma
    await wait(1500);
    for (let t = 0; t < 30; t++) {
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await wait(400);
      if ((await y(page)) === 0) break;
    }
    await wait(1500);
    await page.click(".sj-skipintro", { timeout: 20000 }).catch(() => {});
    await wait(3500);
    const after = await page.evaluate(() => {
      const sj = document.querySelector(".sj");
      return { y: Math.round(scrollY), end: Math.round(sj.offsetTop + sj.offsetHeight - innerHeight), saved: localStorage.getItem("tl-intro-skip") };
    });
    check("«Salta intro» porta alla fine del percorso", Math.abs(after.y - after.end) < 4 && after.saved === "1", `y ${after.y}/${after.end}`);

    // sezioni dopo il percorso
    const hx = await page.evaluate(() => ({
      cards: [...document.querySelectorAll(".hx-card-name")].map((e) => e.textContent),
      h2: [...document.querySelectorAll(".hx h2")].map((e) => e.textContent),
      cta: [...document.querySelectorAll(".hx a")].map((e) => e.getAttribute("href")),
    }));
    check("gamma: card dal catalogo", hx.cards.length >= 5, hx.cards.join(", "));
    check("5 sezioni (gamma, configuratore, perché, processo, CTA)", hx.h2.length === 5, hx.h2.join(" | "));
    check("link a /prodotti, /configuratore e /contatti#preventivo", ["/prodotti", "/configuratore", "/contatti#preventivo"].every((h) => hx.cta.includes(h)));
    const hxEl = await page.$("#dopo-il-percorso");
    await hxEl.scrollIntoViewIfNeeded();
    await page.evaluate(() => document.querySelectorAll("[data-hx-reveal],[data-hx-item]").forEach((e) => e.scrollIntoView({ block: "center" })));
    await wait(1500);
    await hxEl.screenshot({ path: join(OUT, `${label}-home-sezioni.png`), timeout: 120000 });
    const hidden = await page.evaluate(() => [...document.querySelectorAll("[data-hx-reveal],[data-hx-item]")].filter((e) => Number(getComputedStyle(e).opacity) < 0.95).length);
    check("animazioni: tutte le sezioni visibili dopo lo scroll", hidden === 0, `${hidden} ancora nascoste`);

    /* ---------- configuratore */
    const cases = [
      ["flange uguali", "tipo=twistabile&wr=90&l=600&f1=UBR100&f2=UBR100", /^TFTG-100\/600-FF\.FF$/],
      ["flange diverse", "tipo=twistabile&wr=75&l=600&f1=UBR120&f2=PBR120&guaina=si", /^TFTG-120\/600-FF\.GF$/],
      ["transizione TTG", "tipo=transizione&wr=90&wr2=75&l=100", /^TTG-/],
      ["terminazione TR", "tipo=terminazione&wr=90", /^TR-/],
    ];
    for (const [name, qs, re] of cases) {
      await page.goto(`${BASE}/configuratore?${qs}`, { waitUntil: "load", timeout: 120000 });
      await page.waitForSelector('.p3d-stage[data-stage-state="ready"]', { timeout: 90000 }).catch(() => {});
      await wait(1500);
      const code = (await page.textContent("[data-part-code]").catch(() => "")) ?? "";
      check(`configuratore ${name}: codice`, re.test(code.trim()), code);
      check(`configuratore ${name}: niente scroll orizzontale`, (await hScroll(page)) <= 0);
      await page.screenshot({ path: join(OUT, `${label}-config-${name.replace(/\s+/g, "-")}.png`), timeout: 120000 });
      if (label === "desktop" || name === "flange diverse") {
        try {
          const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 120000 }), page.click("[data-datasheet]", { force: true })]);
          const path = join(OUT, `${label}-${dl.suggestedFilename()}`);
          await dl.saveAs(path);
          const bytes = await (await import("node:fs")).promises.readFile(path);
          check(`datasheet PDF ${name}`, bytes.subarray(0, 5).toString() === "%PDF-" && bytes.length > 100000, `${dl.suggestedFilename()} · ${Math.round(bytes.length / 1024)} KB`);
        } catch (e) {
          check(`datasheet PDF ${name}`, false, String(e).slice(0, 120));
        }
      }
    }

    /* ---------- contatti e preventivo */
    await page.goto(`${BASE}/contatti#preventivo`, { waitUntil: "load", timeout: 120000 });
    await wait(1200);
    check("contatti: modulo preventivo presente", (await page.locator("form[data-short-form], form").count()) > 0);
    check("contatti: niente scroll orizzontale", (await hScroll(page)) <= 0);
    await page.screenshot({ path: join(OUT, `${label}-contatti.png`), fullPage: false, timeout: 120000 });
    await page.context().close();
  }

  /* ---------- lingue */
  console.log("\nlingue");
  const page = await newPage({ width: 390, height: 844 });
  for (const [loc, title] of [["", "Ogni pezzo della linea"], ["/en", "Every piece of the waveguide line"], ["/es", null], ["/de", null], ["/zh", null]]) {
    const res = await page.goto(`${BASE}${loc}/`, { waitUntil: "load", timeout: 120000 });
    const txt = await page.evaluate(() => document.querySelector(".hx")?.innerText ?? "");
    check(`home ${loc || "/it"}: risponde 200 e sezioni presenti`, res.status() === 200 && txt.length > 200 && !/homeNext\./.test(txt), title ? (txt.includes(title) ? title : "titolo mancante") : `${txt.length} caratteri`);
    check(`home ${loc || "/it"}: niente scroll orizzontale a 390`, (await hScroll(page)) <= 0);
  }
  await page.context().close();
} catch (e) {
  fails++;
  console.log("  ✗ interrotto:", e);
} finally {
  await browser.close();
}
check("nessun errore JavaScript", errors.length === 0, errors.slice(0, 3).join(" · "));
writeFileSync(join(OUT, "esito.txt"), `${new Date().toISOString()} · ${fails ? `${fails} controlli falliti` : "tutto ok"}\n`);
console.log(fails ? `\n${fails} controlli falliti` : "\ntutto ok");
process.exit(fails ? 1 : 0);
