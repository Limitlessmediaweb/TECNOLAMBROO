/**
 * Catalogo prodotti e trattamenti: lettura e controllo di catalogo/catalogo.csv (separatore ";").
 *
 * Modulo puro, senza import: lo usano sia il sito (src/lib/catalog/index.ts, alla build) sia lo script
 * di controllo (scripts/catalogo-check.mjs, con Node che toglie i tipi da solo). Per questo solo
 * sintassi TypeScript "cancellabile" (niente enum, niente alias @/…).
 *
 * Regole:
 * - una riga per prodotto o trattamento (colonna `tipo`); le righe vuote e quelle che iniziano con # si saltano;
 * - `stato`: pubblicato (online), bozza (solo anteprima), ESEMPIO (solo anteprima, da cancellare);
 * - testi in 5 lingue (colonne _it _en _es _zh _de): italiano obbligatorio, le lingue vuote usano
 *   l'inglese e poi l'italiano;
 * - una riga con errori non va sul sito; gli avvisi non bloccano.
 */

export const LANGS = ["it", "en", "es", "zh", "de"] as const;
export type Lang = (typeof LANGS)[number];
export type LangText = Partial<Record<Lang, string>>;

export const KINDS = ["prodotto", "trattamento"] as const;
export type CatalogKind = (typeof KINDS)[number];
export const STATES = ["pubblicato", "bozza", "esempio"] as const;
export type CatalogState = (typeof STATES)[number];

/** Chiavi delle famiglie del sito (src/data/families.ts) per la colonna `famiglie` dei trattamenti. */
export const FAMILY_KEYS = ["twistable", "seamless", "bends", "twists", "offsets"] as const;

/** Cartelle di public/foto/ usate dal resto del sito, non da codici del catalogo. */
export const RESERVED_PHOTO_DIRS = ["prodotti", "officina", "persone"] as const;

const T = (field: string) => LANGS.map((l) => `${field}_${l}`);

/** Colonne del CSV, nell'ordine del modello. */
export const COLUMNS: readonly string[] = [
  "tipo",
  "codice",
  "stato",
  ...T("nome"),
  ...T("categoria"),
  ...T("descrizione"),
  ...T("materiale"),
  "misure",
  "norma",
  "trattamenti",
  ...T("uso"),
  "famiglie",
];

/** Codice: lettere, numeri, trattino e trattino basso (diventa il nome della cartella foto e l'indirizzo). */
export const CODE_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;

export type CatalogRow = {
  /** riga del file (1 = intestazione) */
  line: number;
  kind: CatalogKind;
  code: string;
  /** nell'indirizzo: codice in minuscolo */
  slug: string;
  state: CatalogState;
  name: LangText;
  category: LangText;
  description: LangText;
  material: LangText;
  sizes: string;
  norm: string;
  /** prodotti: codici dei trattamenti disponibili */
  treatments: string[];
  /** trattamenti: a cosa serve */
  use: LangText;
  /** trattamenti: famiglie del sito su cui si fa */
  families: string[];
};

export type Issue = { level: "error" | "warning"; line?: number; code?: string; message: string };

export type ReadResult = {
  /** righe senza errori */
  rows: CatalogRow[];
  /** tutti i codici scritti nel file, anche delle righe con errori (per il controllo delle cartelle foto) */
  allCodes: string[];
  issues: Issue[];
  encoding: "utf-8" | "windows-1252";
};

/** Testo nella lingua richiesta; se manca, inglese, poi italiano. */
export function inLang(text: LangText | undefined, lang: string): string {
  if (!text) return "";
  return text[lang as Lang] || text.en || text.it || "";
}

/** UTF-8 (con o senza BOM); se non lo è, Windows-1252 (il "CSV" normale di Excel su Windows). */
export function decodeCsv(bytes: Uint8Array): { text: string; encoding: ReadResult["encoding"] } {
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^﻿/, ""), encoding: "utf-8" };
  } catch {
    return { text: new TextDecoder("windows-1252").decode(bytes), encoding: "windows-1252" };
  }
}

/** CSV con virgolette ("" = virgoletta), a capo dentro le virgolette ammessi. Restituisce i campi e la riga di inizio. */
export function parseCsv(text: string, sep = ";"): { fields: string[]; line: number }[] {
  const out: { fields: string[]; line: number }[] = [];
  let fields: string[] = [];
  let cur = "";
  let quoted = false;
  let line = 1;
  let start = 1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else {
        if (ch === "\n") line++;
        cur += ch;
      }
      continue;
    }
    if (ch === '"' && cur.trim() === "") {
      quoted = true;
      cur = "";
    } else if (ch === sep) {
      fields.push(cur);
      cur = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      fields.push(cur);
      out.push({ fields, line: start });
      fields = [];
      cur = "";
      line++;
      start = line;
    } else cur += ch;
  }
  if (cur !== "" || fields.length) {
    fields.push(cur);
    out.push({ fields, line: start });
  }
  return out;
}

const clean = (v: string | undefined) => (v ?? "").replace(/\r\n?/g, "\n").trim();
const list = (v: string) =>
  v
    .split(/[,|]/)
    .map((x) => x.trim())
    .filter(Boolean);

/** Legge e controlla il CSV. `bytes` è il contenuto del file. */
export function readCatalog(bytes: Uint8Array): ReadResult {
  const issues: Issue[] = [];
  const { text, encoding } = decodeCsv(bytes);
  if (encoding !== "utf-8") {
    issues.push({ level: "warning", message: "Il file non è in UTF-8: le lettere accentate possono rovinarsi. In Excel: File → Salva con nome → “CSV UTF-8 (delimitato da virgole)”." });
  }
  const records = parseCsv(text).filter((r) => r.fields.some((f) => f.trim() !== ""));
  if (!records.length) return { rows: [], allCodes: [], issues: [{ level: "error", message: "Il file è vuoto: manca la riga delle intestazioni." }], encoding };

  const headerRec = records[0];
  if (headerRec.fields.length === 1 && /[,\t]/.test(headerRec.fields[0])) {
    issues.push({ level: "error", line: 1, message: "Separatore sbagliato: le colonne vanno separate con il punto e virgola (;), non con la virgola o il tab." });
    return { rows: [], allCodes: [], issues, encoding };
  }
  const header = headerRec.fields.map((h) => h.trim().toLowerCase());
  const missing = COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) issues.push({ level: "error", line: 1, message: `Colonne mancanti: ${missing.join(", ")}. Copia l’intestazione dal modello (catalogo/LEGGIMI.md).` });
  const unknown = header.filter((h) => h && !COLUMNS.includes(h));
  if (unknown.length) issues.push({ level: "warning", line: 1, message: `Colonne sconosciute, ignorate: ${unknown.join(", ")}.` });
  const dup = header.filter((h, i) => h && header.indexOf(h) !== i);
  if (dup.length) issues.push({ level: "error", line: 1, message: `Colonne ripetute: ${[...new Set(dup)].join(", ")}.` });
  if (missing.length || dup.length) return { rows: [], allCodes: [], issues, encoding };

  const col = (fields: string[], name: string) => clean(fields[header.indexOf(name)]);
  const txt = (fields: string[], field: string): LangText => {
    const o: LangText = {};
    for (const l of LANGS) {
      const v = col(fields, `${field}_${l}`);
      if (v) o[l] = v;
    }
    return o;
  };

  const parsed: { row: CatalogRow; ok: boolean }[] = [];
  for (const rec of records.slice(1)) {
    const f = rec.fields;
    if (f[0]?.trim().startsWith("#")) continue;
    const line = rec.line;
    const rawCode = col(f, "codice");
    const at = { line, code: rawCode || undefined };
    let ok = true;
    // gli avvisi di una riga con errori non si mostrano: prima vanno sistemati gli errori
    const warnings: Issue[] = [];
    const err = (message: string) => {
      ok = false;
      issues.push({ level: "error", ...at, message });
    };
    const warn = (message: string) => warnings.push({ level: "warning", ...at, message });

    if (f.length !== header.length) {
      err(`La riga ha ${f.length} campi invece di ${header.length}. Di solito è un “;” dentro un testo: metti quel testo tra virgolette, oppure una cella è stata unita o tolta.`);
    }
    const kind = col(f, "tipo").toLowerCase() as CatalogKind;
    if (!KINDS.includes(kind)) err(`Colonna tipo: “${col(f, "tipo")}” non valido, scrivi prodotto o trattamento.`);
    if (!rawCode) err("Manca il codice.");
    else if (!CODE_RE.test(rawCode)) err(`Codice “${rawCode}” non valido: solo lettere, numeri, - e _ (niente spazi, barre o punti), al massimo 40 caratteri.`);

    let state = col(f, "stato").toLowerCase() as CatalogState;
    if (!col(f, "stato")) {
      warn("Manca lo stato: la riga resta in bozza (non va online). Scrivi pubblicato quando è pronta.");
      state = "bozza";
    } else if (!STATES.includes(state)) {
      err(`Colonna stato: “${col(f, "stato")}” non valido, scrivi pubblicato, bozza o ESEMPIO.`);
      state = "bozza";
    }

    const row: CatalogRow = {
      line,
      kind: KINDS.includes(kind) ? kind : "prodotto",
      code: rawCode,
      slug: rawCode.toLowerCase(),
      state,
      name: txt(f, "nome"),
      category: txt(f, "categoria"),
      description: txt(f, "descrizione"),
      material: txt(f, "materiale"),
      sizes: col(f, "misure"),
      norm: col(f, "norma"),
      treatments: list(col(f, "trattamenti")),
      use: txt(f, "uso"),
      families: list(col(f, "famiglie")).map((x) => x.toLowerCase()),
    };

    if (!row.name.it) err("Manca nome_it (il nome in italiano è obbligatorio).");
    if (state === "esempio") warn("Riga di ESEMPIO: non va online. Cancellala quando inserisci i dati veri.");
    if (state === "pubblicato") {
      if (!row.name.en) warn("Manca nome_en: in inglese si vedrà il nome italiano.");
      const empty = LANGS.filter((l) => l !== "it" && !row.name[l]);
      if (row.name.en && empty.length) warn(`Traduzioni mancanti (${empty.join(", ")}): in quelle lingue si vede l’inglese.`);
      if (!row.description.it) warn("Manca descrizione_it: la scheda resta senza descrizione.");
      if (row.kind === "prodotto") {
        if (!row.material.it) warn("Manca materiale_it.");
        if (!row.sizes && !row.norm) warn("Mancano misure e norma.");
      } else {
        if (!row.use.it) warn("Manca uso_it (a cosa serve il trattamento).");
        if (!row.material.it) warn("Manca materiale_it (su quali materiali si fa il trattamento).");
      }
    }
    if (row.kind === "prodotto") {
      if (row.use.it || row.use.en) warn("Le colonne uso_* valgono solo per i trattamenti: ignorate.");
      if (row.families.length) warn("La colonna famiglie vale solo per i trattamenti: ignorata.");
    } else {
      if (row.treatments.length) warn("La colonna trattamenti vale solo per i prodotti: ignorata.");
      const bad = row.families.filter((x) => !(FAMILY_KEYS as readonly string[]).includes(x));
      if (bad.length) warn(`Famiglie sconosciute, ignorate: ${bad.join(", ")}. Valori ammessi: ${FAMILY_KEYS.join(", ")}.`);
      row.families = row.families.filter((x) => (FAMILY_KEYS as readonly string[]).includes(x));
    }
    if (ok) issues.push(...warnings);
    parsed.push({ row, ok });
  }

  // codici doppi (maiuscole e minuscole non contano: diventano lo stesso indirizzo)
  const bySlug = new Map<string, CatalogRow[]>();
  for (const { row } of parsed) if (row.code) bySlug.set(row.slug, [...(bySlug.get(row.slug) ?? []), row]);
  const doubled = new Set<string>();
  for (const [slug, rows] of bySlug) {
    if (rows.length < 2) continue;
    doubled.add(slug);
    issues.push({ level: "error", code: rows[0].code, line: rows[0].line, message: `Codice doppio: ${rows.map((r) => `“${r.code}” (riga ${r.line})`).join(", ")}. Ogni codice deve comparire una volta sola: nessuna di queste righe va online.` });
  }

  const rows = parsed.filter((p) => p.ok && !doubled.has(p.row.slug)).map((p) => p.row);

  // trattamenti citati dai prodotti
  const treatmentBySlug = new Map(rows.filter((r) => r.kind === "trattamento").map((r) => [r.slug, r]));
  for (const r of rows) {
    if (r.kind !== "prodotto") continue;
    for (const code of r.treatments) {
      const tr = treatmentBySlug.get(code.toLowerCase());
      if (!tr) issues.push({ level: "warning", line: r.line, code: r.code, message: `Trattamento “${code}” non trovato tra le righe di tipo trattamento: il collegamento non compare.` });
      else if (r.state === "pubblicato" && tr.state !== "pubblicato") issues.push({ level: "warning", line: r.line, code: r.code, message: `Il trattamento “${tr.code}” non è pubblicato: online il collegamento non compare.` });
    }
  }
  return { rows, allCodes: parsed.map((p) => p.row.code).filter(Boolean), issues, encoding };
}

/** Ordinamento "naturale": 2.jpg prima di 10.jpg. */
const natural = (a: string, b: string) => a.localeCompare(b, "it", { numeric: true, sensitivity: "base" });

export const PHOTO_RE = /\.(jpe?g|png|webp|avif)$/i;

/**
 * Foto della cartella di un codice. Prodotti: tutte, in ordine (1.jpg, 2.jpg…); la prima è la copertina.
 * Trattamenti: i file che iniziano con "prima" e "dopo" formano le coppie prima/dopo, gli altri la galleria.
 * Se esistono lo stesso nome in .jpg e .webp si usa il .webp (npm run foto).
 */
export function classifyPhotos(files: string[]): { gallery: string[]; before: string[]; after: string[] } {
  const images = files.filter((f) => PHOTO_RE.test(f) && !f.startsWith("."));
  const base = (f: string) => f.replace(PHOTO_RE, "").toLowerCase();
  const best = new Map<string, string>();
  const rank = (f: string) => (/\.webp$/i.test(f) ? 0 : /\.avif$/i.test(f) ? 1 : 2);
  for (const f of images) {
    const prev = best.get(base(f));
    if (!prev || rank(f) < rank(prev)) best.set(base(f), f);
  }
  const unique = [...best.values()].sort(natural);
  return {
    before: unique.filter((f) => /^prima/i.test(f)),
    after: unique.filter((f) => /^dopo/i.test(f)),
    gallery: unique.filter((f) => !/^(prima|dopo)/i.test(f)),
  };
}
