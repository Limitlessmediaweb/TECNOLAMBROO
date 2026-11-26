/**
 * Catalogo ufficiale per il configuratore: prodotti, misure e flange vengono SOLO da qui.
 * Il dato è src/data/catalogo-ufficiale.json, generato da CATALOGO-UFFICIALE.csv con
 * `npm run catalogo:ufficiale` (scripts/catalogo-ufficiale.mjs): non si scrive a mano.
 *
 * Le righe "da confermare" (status "tbc") si vedono solo in anteprima, con il badge DA CONFERMARE;
 * in produzione non esistono. Il flag: NEXT_PUBLIC_CATALOGO_DA_CONFERMARE = "1" le mostra, "0" le
 * nasconde; se manca, si vedono in sviluppo e nelle preview di Vercel, mai in produzione.
 *
 * Le quote delle flange restano in src/data/flanges.ts (norma Spinner): una flangia del catalogo
 * senza quote lì non si può disegnare e non entra nel configuratore.
 */
import data from "./catalogo-ufficiale.json";
import { FLANGES, type FlangeDef } from "./flanges";
import { WR_LIST } from "./waveguides";
import type { PartType, Plane } from "./configurator/types";

export type CatStatus = "ok" | "tbc";

type RawProduct = {
  type: PartType;
  plane?: Plane;
  wr: string;
  wr2?: string;
  code?: string;
  status: CatStatus;
  data?: string;
  flanges: string[];
  flanges2?: string[];
  rec: string[];
  rec2?: string[];
  generic?: boolean;
};

function showTbc(): boolean {
  const flag = process.env.NEXT_PUBLIC_CATALOGO_DA_CONFERMARE;
  if (flag === "1") return true;
  if (flag === "0") return false;
  const env = process.env.NEXT_PUBLIC_VERCEL_ENV;
  return env ? env !== "production" : process.env.NODE_ENV !== "production";
}
/** In questa build si vedono anche le righe da confermare (anteprima). */
export const SHOW_TBC = showTbc();

const ALL = data.products as RawProduct[];
const PRODUCTS = ALL.filter((p) => SHOW_TBC || p.status === "ok");
const FLANGE_STATUS = data.flanges as Record<string, CatStatus>;

/** Una flangia proposta per un lato del pezzo. */
export type CatFlange = { def: FlangeDef; status: CatStatus; rec: boolean };

const samePlane = (p: RawProduct, plane: Plane | undefined) => p.type !== "bend" || p.plane === (plane ?? "E");

/**
 * Il prodotto a catalogo per tipo, misura (e piano per le curve, lato 2 per le transizioni).
 * Transizione senza `wr2`: la prima coppia che contiene la misura.
 */
export function catalogProduct(type: PartType, wr: string, plane?: Plane, wr2?: string): RawProduct | undefined {
  if (type === "transition") return PRODUCTS.find((p) => p.type === type && (wr2 ? (p.wr === wr && p.wr2 === wr2) || (p.wr === wr2 && p.wr2 === wr) : p.wr === wr || p.wr2 === wr));
  return PRODUCTS.find((p) => p.type === type && p.wr === wr && samePlane(p, plane));
}

/** Misure a catalogo per il tipo, nell'ordine del sito. */
export function catalogSizes(type: PartType, plane?: Plane): string[] {
  return WR_LIST.filter((wr) => catalogProduct(type, wr, plane));
}

/** Il tipo ha almeno un prodotto visibile in questa build? */
export function typeInCatalog(type: PartType, plane?: Plane): boolean {
  return catalogSizes(type, plane).length > 0;
}

/** Misura iniziale: WR-90 se c'è, altrimenti la prima a catalogo (preferendo le confermate). */
export function firstSize(type: PartType, plane?: Plane, prefer = "WR-90"): string {
  const sizes = catalogSizes(type, plane);
  if (sizes.includes(prefer)) return prefer;
  return sizes.find((wr) => catalogProduct(type, wr, plane)?.status === "ok") ?? sizes[0] ?? prefer;
}

/** Misure del lato 2 di una transizione partendo da `wr`: prima le coppie confermate. */
export function transitionPartners(wr: string): string[] {
  const out = PRODUCTS.filter((p) => p.type === "transition" && (p.wr === wr || p.wr2 === wr)).map((p) => ({ wr: p.wr === wr ? p.wr2! : p.wr, ok: p.status === "ok" }));
  return [...out.filter((x) => x.ok), ...out.filter((x) => !x.ok)].map((x) => x.wr);
}

type Side = { type: PartType; wr: string; plane?: Plane; wr2?: string };

/** Misura della guida sul lato `side` (sulle transizioni il lato 2 è la seconda misura). */
export function sideSize(s: Side, side: 1 | 2): string {
  return side === 2 && s.type === "transition" && s.wr2 ? s.wr2 : s.wr;
}

/**
 * Flange del catalogo per un lato del pezzo, le consigliate per prime. Solo quelle con le quote in
 * flanges.ts e, in produzione, solo quelle confermate.
 */
export function catalogFlanges(s: Side, side: 1 | 2): CatFlange[] {
  const p = catalogProduct(s.type, s.wr, s.plane, s.wr2);
  if (!p) return [];
  const wr = sideSize(s, side);
  // sulle transizioni il prodotto può essere scritto al contrario (wr2 → wr)
  const flip = s.type === "transition" && p.wr !== s.wr;
  const lado2 = (side === 2) !== flip && s.type === "transition";
  const names = lado2 ? (p.flanges2 ?? p.flanges) : p.flanges;
  const recs = lado2 ? (p.rec2 ?? p.rec) : p.rec;
  const defs = FLANGES[wr] ?? [];
  const out: CatFlange[] = [];
  for (const def of defs) {
    if (!names.includes("*") && !names.includes(def.label)) continue;
    const st = FLANGE_STATUS[`${wr}|${def.label}`];
    if (!st) continue; // flangia non a catalogo per questa misura
    if (st === "tbc" && !SHOW_TBC) continue;
    out.push({ def, status: st, rec: recs.includes(def.label) });
  }
  const order = (f: CatFlange) => (f.rec ? recs.indexOf(f.def.label) : 100);
  return out.sort((a, b) => order(a) - order(b));
}

/** Flange della misura che il catalogo NON prevede per questo prodotto (per spiegare perché non si scelgono). */
export function blockedFlanges(s: Side, side: 1 | 2): FlangeDef[] {
  const ok = new Set(catalogFlanges(s, side).map((f) => f.def.id));
  return (FLANGES[sideSize(s, side)] ?? []).filter((f) => !ok.has(f.id));
}

/** La flangia `id` si può scegliere su quel lato? ("Altra flangia" sempre) */
export function flangeAllowed(s: Side, side: 1 | 2, id: string, other = "other"): boolean {
  return id === other || catalogFlanges(s, side).some((f) => f.def.id === id);
}

/**
 * Flange di partenza consigliate dai nostri datasheet: la prima consigliata sul lato 1 e, sul lato 2,
 * la seconda consigliata (es. UBR + PBR) o la stessa se ce n'è una sola. Transizione: la prima
 * consigliata di ciascun lato.
 */
export function defaultFlanges(s: Side, other = "other"): [string, string] {
  const l1 = catalogFlanges(s, 1);
  const f1 = l1[0]?.def.id ?? other;
  if (s.type === "transition") return [f1, catalogFlanges(s, 2)[0]?.def.id ?? other];
  const recs = l1.filter((f) => f.rec);
  return [f1, s.type === "termination" ? f1 : (recs[1]?.def.id ?? f1)];
}

/** Numeri per i controlli e il report. */
export function catalogCounts() {
  const fl = Object.values(FLANGE_STATUS);
  return {
    productsOk: ALL.filter((p) => p.status === "ok").length,
    productsTbc: ALL.filter((p) => p.status === "tbc").length,
    flangesOk: fl.filter((x) => x === "ok").length,
    flangesTbc: fl.filter((x) => x === "tbc").length,
  };
}
