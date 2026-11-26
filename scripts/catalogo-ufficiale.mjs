#!/usr/bin/env node
/**
 * npm run catalogo:ufficiale — converte CATALOGO-UFFICIALE.csv (analisi del materiale della ditta)
 * in src/data/catalogo-ufficiale.json, l'UNICA fonte di prodotti, misure e flange del configuratore.
 *
 * Ripetibile: si rilancia ogni volta che il CSV cambia. Applica anche le risposte scritte a mano in
 * CODICI-DA-PRENDERE.md (codice ufficiale → riga confermata; «non lo facciamo» → riga tolta).
 * DOMANDE-PAPA.md non si legge da solo (risposte a testo libero): lo script dice solo se è stato
 * compilato, poi le risposte si riportano nel CSV.
 *
 * Fonte (in quest'ordine): variabile CATALOGO_UFFICIALE_DIR, la cartella dell'analisi accanto al
 * repo (../00_MATERIALE/06_ANALISI_CLAUDE_CODE), la copia in catalogo/ufficiale/. La copia nel repo
 * si aggiorna a ogni lancio, così il dato resta tracciato in git.
 *
 * Regole:
 *  - entra nel configuratore solo una riga con colonna «configuratore» che inizia per «sì»;
 *  - le righe «da confermare» restano nel file con status "tbc": il sito le mostra solo in anteprima;
 *  - le righe generiche («altre misure», «tutte», «altre coppie») diventano righe "tbc" per le
 *    misure (o le coppie vicine) che il catalogo non elenca già, con tutte le flange della misura ("*");
 *  - le flange restano sigle come nel CSV (es. "IEC-UBR 100"); il sito le collega alle quote di
 *    src/data/flanges.ts e scarta quelle senza quote.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CANDIDATES = [process.env.CATALOGO_UFFICIALE_DIR, join(ROOT, "..", "00_MATERIALE", "06_ANALISI_CLAUDE_CODE"), join(ROOT, "catalogo", "ufficiale")].filter(Boolean);
const SRC = CANDIDATES.find((d) => existsSync(join(d, "CATALOGO-UFFICIALE.csv")));
if (!SRC) {
  console.error("CATALOGO-UFFICIALE.csv non trovato in:\n  " + CANDIDATES.join("\n  "));
  process.exit(1);
}
const COPY = join(ROOT, "catalogo", "ufficiale");
const OUT = join(ROOT, "src", "data", "catalogo-ufficiale.json");

/** Le 14 misure del sito, in ordine (stesso elenco di src/data/waveguides.ts). */
const WR = ["WR-22", "WR-28", "WR-34", "WR-42", "WR-51", "WR-62", "WR-75", "WR-90", "WR-112", "WR-137", "WR-159", "WR-187", "WR-229", "WR-284"];

/* ------------------------------------------------------------------ CSV */
function parseCsv(text, sep = ";") {
  const rows = [];
  let row = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [head, ...body] = rows.filter((r) => r.some((x) => x.trim()));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

const csvText = readFileSync(join(SRC, "CATALOGO-UFFICIALE.csv"), "utf8").replace(/^﻿/, "");
const rows = parseCsv(csvText);

/* ------------------------------------------------- risposte di Riccardo */
/** CODICI-DA-PRENDERE.md: tabelle | Prodotto | Misura | Codice ufficiale | sotto "## <famiglia>". */
function readCodes() {
  const file = join(SRC, "CODICI-DA-PRENDERE.md");
  if (!existsSync(file)) return [];
  const out = [];
  let fam = "";
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const h = line.match(/^##\s+(.+)/);
    if (h) fam = h[1].trim();
    const m = line.match(/^\|([^|]*)\|([^|]*)\|([^|]*)\|\s*$/);
    if (!m) continue;
    const [prod, misura, code] = m.slice(1).map((s) => s.trim());
    if (!code || /^-+$/.test(code) || prod === "Prodotto") continue;
    out.push({ fam, prod, misura: misura.replace(/\s*\(.*\)\s*$/, "").trim(), code });
  }
  return out;
}
const answers = readCodes();
let applied = 0;
for (const a of answers) {
  if (a.fam === "Codici provvisori da confermare") {
    const r = rows.find((x) => x.prodotto.startsWith(a.prod.split(" / ")[0]) || x.codice_ufficiale.startsWith(a.misura.split(" ")[0]));
    if (r && !/non lo facciamo/i.test(a.code)) {
      r.codice_ufficiale = a.code;
      r.stato = "confermato";
      applied++;
    }
    continue;
  }
  const r = rows.find((x) => x.prodotto === a.prod && (x.misura_WR === a.misura || x.misura_WR.startsWith(a.misura)));
  if (!r) {
    console.warn(`  ! risposta non collegata a nessuna riga: ${a.prod} ${a.misura} → ${a.code}`);
    continue;
  }
  if (/non lo facciamo/i.test(a.code)) r.configuratore = "no (non lo facciamo)";
  else {
    r.codice_ufficiale = a.code;
    r.stato = "confermato";
  }
  applied++;
}

const domande = join(SRC, "DOMANDE-PAPA.md");
const domandeVuote = existsSync(domande) ? (readFileSync(domande, "utf8").match(/_{4,}|\*\*sì \/ no\*\*/g) ?? []).length : 0;

/* --------------------------------------------------------------- famiglie */
/** famiglia del CSV → tipo del configuratore (le altre sono accessori o «su richiesta»). */
const TYPE = {
  "Flessibile twistabile": "twistable",
  "Flessibile seamless": "seamless",
  "Curve piano E": "bend",
  "Curve piano H": "bend",
  Twist: "twist",
  Disassati: "offset",
  "Tratti rigidi TGR": "straight",
  "Pressurizzatori TGP": "pressure",
  "Transizioni TTG": "transition",
  "Terminazioni TR": "termination",
  "Spessori TSP": "spacer",
};
const ok = (r) => /^sì/i.test(r.configuratore) && !/accessori|senza 3D/i.test(r.configuratore);
const status = (r) => (/^confermato/i.test(r.stato) ? "ok" : "tbc");
const list = (s) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

/** Flange consigliate: sigle intere o abbreviate ("PBR", "UDR 70", "CPR", "PBR (o M3922/59)"). */
function resolveRec(tokens, possible) {
  const out = [];
  for (const raw of tokens) {
    const tok = raw.replace(/\(.*?\)/g, "").trim();
    if (!tok) continue;
    let hit = possible.filter((p) => p === tok);
    const iec = tok.match(/^(UBR|PBR|CBR|UDR|PDR|UAR|PAR|CAR)(?:\s*(\d+))?$/);
    const cpr = tok.match(/^CPR(?:\s*(\d+))?(?:\s*([FG]))?$/);
    if (!hit.length && iec) hit = possible.filter((p) => p.startsWith(`IEC-${iec[1]} `) && (!iec[2] || p.endsWith(` ${iec[2]}`)));
    if (!hit.length && cpr) hit = possible.filter((p) => p.startsWith("CPR ") && (!cpr[1] || p.includes(` ${cpr[1]} `)) && (!cpr[2] || p.endsWith(` ${cpr[2]}`)));
    for (const h of hit) if (!out.includes(h)) out.push(h);
  }
  return out;
}

const products = [];
for (const r of rows) {
  const type = TYPE[r.famiglia];
  if (!type || !ok(r)) continue;
  const plane = r.famiglia === "Curve piano E" ? "E" : r.famiglia === "Curve piano H" ? "H" : undefined;
  const base = { type, ...(plane ? { plane } : {}), code: r.codice_ufficiale.replace(/\s*\(.*\)$/, ""), status: status(r), data: r.configuratore.replace(/^sì,?\s*/i, "") || undefined };
  if (type === "transition") {
    const pair = r.misura_WR.match(/^(WR-\d+)\/(WR-\d+)$/);
    if (!pair) continue; // «altre coppie»: sotto
    const [p1, p2] = r.flange_possibili.split("|").map(list);
    const [c1, c2 = c1] = r.flange_consigliate.split(" / ").map(list);
    products.push({ ...base, wr: pair[1], wr2: pair[2], flanges: p1, flanges2: p2, rec: resolveRec(c1, p1), rec2: resolveRec(c2, p2) });
    continue;
  }
  if (WR.includes(r.misura_WR)) {
    const possible = /^flange (della|delle)/i.test(r.flange_possibili) ? ["*"] : list(r.flange_possibili);
    products.push({ ...base, wr: r.misura_WR, flanges: possible, rec: resolveRec(list(r.flange_consigliate), possible) });
    continue;
  }
  // riga generica: «altre misure», «altre», «tutte»
  if (/^(altre|tutte)/i.test(r.misura_WR)) {
    for (const wr of WR) {
      if (products.some((p) => p.type === type && p.wr === wr && p.plane === base.plane)) continue;
      if (rows.some((x) => TYPE[x.famiglia] === type && x.misura_WR === wr)) continue;
      products.push({ ...base, code: base.code, status: "tbc", wr, flanges: ["*"], rec: [], generic: true });
    }
  }
}
// transizioni tra altre coppie di misure vicine
const otherPairs = rows.find((r) => TYPE[r.famiglia] === "transition" && /^altre/i.test(r.misura_WR) && ok(r));
if (otherPairs) {
  for (let i = 0; i < WR.length - 1; i++) {
    const [a, b] = [WR[i], WR[i + 1]];
    if (products.some((p) => p.type === "transition" && ((p.wr === a && p.wr2 === b) || (p.wr === b && p.wr2 === a)))) continue;
    products.push({ type: "transition", code: "", status: "tbc", data: otherPairs.configuratore.replace(/^sì,?\s*/i, ""), wr: b, wr2: a, flanges: ["*"], flanges2: ["*"], rec: [], rec2: [], generic: true });
  }
}

/** Flange del catalogo con il loro stato (solo quelle che il configuratore può disegnare). */
const flanges = {};
for (const r of rows) {
  if (r.famiglia !== "Flange" || !/^sì/i.test(r.configuratore)) continue;
  flanges[`${r.misura_WR}|${r.prodotto}`] = status(r);
}

for (const p of products) {
  for (const k of ["data", "plane", "generic"]) if (p[k] === undefined) delete p[k];
  if (!p.code) delete p.code;
}

const json = {
  _: "Generato da scripts/catalogo-ufficiale.mjs da CATALOGO-UFFICIALE.csv: non modificare a mano.",
  products,
  flanges,
};
writeFileSync(OUT, JSON.stringify(json, null, 1) + "\n");

if (SRC !== COPY) {
  mkdirSync(COPY, { recursive: true });
  for (const f of ["CATALOGO-UFFICIALE.csv", "CODICI-DA-PRENDERE.md", "DOMANDE-PAPA.md"]) if (existsSync(join(SRC, f))) copyFileSync(join(SRC, f), join(COPY, f));
}

const n = (pred) => products.filter(pred).length;
const fl = Object.values(flanges);
console.log(`Fonte: ${SRC}`);
console.log(`→ ${OUT.replace(ROOT, ".")} (${products.length} righe del configuratore)`);
console.log(`  prodotti: ${n((p) => p.status === "ok")} confermati, ${n((p) => p.status === "tbc")} da confermare (di cui ${n((p) => p.generic)} da righe generiche)`);
console.log(`  flange disegnabili: ${fl.filter((s) => s === "ok").length} confermate, ${fl.filter((s) => s === "tbc").length} da confermare`);
console.log(`  risposte applicate da CODICI-DA-PRENDERE.md: ${applied}`);
console.log(`  DOMANDE-PAPA.md: ${domandeVuote} campi ancora da compilare (le risposte vanno riportate nel CSV)`);
