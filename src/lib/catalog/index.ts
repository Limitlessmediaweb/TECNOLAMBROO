import "server-only";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ENV } from "@/data/site";
import { classifyPhotos, inLang, readCatalog, type CatalogRow, type LangText } from "./schema";

export { inLang, type LangText } from "./schema";

/**
 * Catalogo del sito, letto alla build da catalogo/catalogo.csv (vedi catalogo/LEGGIMI.md).
 * Le foto si collegano da sole: public/foto/<CODICE>/ (stesso codice, maiuscole comprese).
 *
 * Online vanno solo le righe con stato "pubblicato" e senza errori. Bozze ed ESEMPIO si vedono solo
 * in anteprima (sviluppo, NEXT_PUBLIC_DEMO=true, deploy di preview di Vercel), con il loro badge.
 */
const CSV = join(process.cwd(), "catalogo", "catalogo.csv");
const PHOTOS = join(process.cwd(), "public", "foto");

export const SHOW_DRAFTS = ENV.demo || process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV === "development";

export type CatalogItem = CatalogRow & {
  /** percorsi pubblici: galleria (la prima è la copertina), coppie prima/dopo dei trattamenti */
  photos: string[];
  before: string[];
  after: string[];
};

function photosOf(code: string) {
  const dir = join(PHOTOS, code);
  const files = existsSync(dir) ? readdirSync(dir) : [];
  const { gallery, before, after } = classifyPhotos(files);
  const url = (f: string) => `/foto/${code}/${f}`;
  return { photos: gallery.map(url), before: before.map(url), after: after.map(url) };
}

function load(): CatalogItem[] {
  if (!existsSync(CSV)) return [];
  const { rows, issues } = readCatalog(readFileSync(CSV));
  const errors = issues.filter((i) => i.level === "error").length;
  if (errors) console.warn(`[catalogo] ${errors} errori in catalogo/catalogo.csv: quelle righe non vanno online. Dettagli: npm run catalogo:check`);
  return rows.filter((r) => r.state === "pubblicato" || SHOW_DRAFTS).map((r) => ({ ...r, ...photosOf(r.code) }));
}

let cache: CatalogItem[] | null = null;
/** In sviluppo si rilegge a ogni richiesta (modifiche al CSV e alle foto subito visibili). */
function items(): CatalogItem[] {
  if (process.env.NODE_ENV === "development") return load();
  return (cache ??= load());
}

export const catalogProducts = () => items().filter((i) => i.kind === "prodotto");
export const catalogTreatments = () => items().filter((i) => i.kind === "trattamento");

export const findProduct = (slug: string) => catalogProducts().find((i) => i.slug === slug.toLowerCase());
export const findTreatment = (slug: string) => catalogTreatments().find((i) => i.slug === slug.toLowerCase());

/** Trattamenti disponibili per un prodotto (solo quelli visibili). */
export const treatmentsOf = (p: CatalogItem) =>
  p.treatments.map((c) => findTreatment(c)).filter((t): t is CatalogItem => Boolean(t));

/** Prodotti del catalogo che indicano un trattamento. */
export const productsWithTreatment = (t: CatalogItem) => catalogProducts().filter((p) => p.treatments.some((c) => c.toLowerCase() === t.slug));

/** Pagine elenco: esistono (menu, sitemap) solo se c'è almeno una voce visibile. */
export const HAS_CATALOG = catalogProducts().length > 0;
export const HAS_TREATMENTS = catalogTreatments().length > 0;

/** Badge di bozza ed esempio (solo anteprima). */
export function stateBadge(i: CatalogRow): "draft" | "example" | null {
  return i.state === "bozza" ? "draft" : i.state === "esempio" ? "example" : null;
}

/** Categorie presenti, nell'ordine in cui compaiono, con la chiave per il filtro. */
export function categoriesOf(list: CatalogItem[], locale: string): { key: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const i of list) {
    const label = inLang(i.category, locale);
    if (label && !seen.has(categoryKey(i))) seen.set(categoryKey(i), label);
  }
  return [...seen].map(([key, label]) => ({ key, label }));
}

/** Chiave della categoria: dall'italiano, così è la stessa in tutte le lingue. */
export function categoryKey(i: { category: LangText }): string {
  return (i.category.it ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Paragrafi di un testo del CSV (a capo = nuovo paragrafo). */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}
