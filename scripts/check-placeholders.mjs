#!/usr/bin/env node
/**
 * Nella versione pubblica (NEXT_PUBLIC_DEMO assente o false) nessuna pagina deve contenere segnaposto
 * o note interne: "DA COMPLETARE", il badge "Versione demo", i badge gialli "● manca: …",
 * "Dati dimostrativi", "Bozza da far revisionare…", "Valori da verificare…", "Elenco da confermare…",
 * in tutte le lingue. Controlla sia il testo visibile sia il markup del <body> (senza gli script),
 * così anche un elemento nascosto fa fallire il controllo.
 * Visita in Chromium tutte le pagine trovate seguendo i link interni da /, /en, /es, /zh, /de,
 * più le pagine fuori menu (richiesta, conferma, 404).
 * Uso: build senza NEXT_PUBLIC_DEMO (o =false), poi BASE=http://localhost:3211 npm run check:placeholders
 */
import { chromium } from "playwright";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const BASE = (process.env.BASE ?? "http://localhost:3211").replace(/\/$/, "");
const EXTRA = ["/shop/richiesta", "/shop/richiesta/inviata", "/en/shop/request", "/en/shop/request/sent", "/pagina-inesistente", "/en/missing-page"];
const PATTERNS = [
  /DA COMPLETARE/i,
  /TO BE COMPLETED/i,
  /Versione demo/i,
  /Demo version/i,
  /\bmanca:/i,
  /\bmissing:/i,
  /Dati dimostrativi/i,
  /Demo data/i,
  /\[DA /,
  /segnaposto/i,
  /placeholder/i,
  /●/,
  /Bozza da far revisionare/i,
  /Valori da verificare/i,
  /da confermare con l.ufficio tecnico/i,
  /to be confirmed by the engineering office/i,
  // segnaposto dei dati aziendali non sostituito (data/site.ts → siteTokens)
  /%[a-zA-Z]+%/,
];
// cercati solo nel testo visibile: nel markup "placeholder" è un attributo dei campi e "%EF%" compare nei link codificati
const TEXT_ONLY = new Set(["/placeholder/i", "/%[a-zA-Z]+%/"]);

// anche le stesse diciture nelle altre lingue: badge demo, "manca: …", "DA COMPLETARE", nota "bozza",
// "valori da verificare" delle tabelle (testi che esistono solo per l'anteprima)
const escRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const f of readdirSync(join(process.cwd(), "messages")).filter((n) => /^[a-z]{2}\.json$/.test(n))) {
  const m = JSON.parse(readFileSync(join(process.cwd(), "messages", f), "utf8"));
  const c = m.common ?? {};
  for (const v of [c.todo, c.demoBadge, c.demoData, c.draftNote, c.photoPlaceholder, m.tables?.verify, (c.missing ?? "").split("{")[0].trim()]) {
    if (v && v.length > 2) PATTERNS.push(new RegExp(escRe(v), "i"));
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const queue = ["/", "/en", "/es", "/zh", "/de", ...EXTRA, "/es/shop/solicitud", "/zh/shop/request", "/de/shop/anfrage"];
const seen = new Set();
const problems = [];

while (queue.length) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  seen.add(path);
  const res = await page.goto(BASE + path, { waitUntil: "networkidle" }).catch(() => null);
  if (!res) continue;
  // testo visibile + markup del body senza script (gli script contengono i testi dei messaggi, anche quelli solo per l'anteprima).
  // Nel markup "placeholder" è il nome di un attributo dei campi: lì si cerca solo nel testo.
  const { text, html } = await page.evaluate(() => {
    const body = document.body.cloneNode(true);
    body.querySelectorAll("script, template, noscript").forEach((n) => n.remove());
    return { text: document.body.innerText, html: body.innerHTML };
  });
  const found = (re, s) => (re.test(s) ? s.match(re)?.[0] : null);
  const hits = PATTERNS.map((re) => found(re, text) ?? (TEXT_ONLY.has(String(re)) ? null : found(re, html))).filter(Boolean);
  if (hits.length) problems.push({ path, hits });
  const links = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href") ?? ""));
  for (const href of links) {
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    const u = new URL(href, BASE);
    if (/\.(pdf|png|jpe?g|webp|svg|xml|txt|glb|stl)$/i.test(u.pathname) || u.pathname.startsWith("/api/")) continue;
    if (!seen.has(u.pathname)) queue.push(u.pathname);
  }
}
await browser.close();

console.log(`Pagine controllate: ${seen.size}`);
if (problems.length) {
  for (const p of problems) console.error(`✗ ${p.path}: ${p.hits.join(", ")}`);
  process.exit(1);
}
console.log("✓ Nessun segnaposto visibile");
