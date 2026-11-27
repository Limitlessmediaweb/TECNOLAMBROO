import type { Href } from "@/components/ui/TrackedLink";
import type { Locale } from "@/i18n/routing";
import type { PartType } from "@/data/configurator/types";
import { TYPE_PARAM } from "@/data/configurator/defaults";
import { confirmedProducts, type RawProduct } from "@/data/catalogo";
import { WR_LIST } from "@/data/waveguides";
import { familyForType, familySlug, type Family } from "@/data/families";

/** Ordine delle famiglie: dalla guida rigida agli accessori. */
const ORDER: PartType[] = ["straight", "twistable", "seamless", "bend", "twist", "offset", "transition", "termination", "pressure", "spacer"];

export type ProductFamily = {
  type: PartType;
  /** ancora nella pagina /prodotti (es. "twistabile") e valore di ?tipo= del configuratore */
  anchor: string;
  /** misure WR confermate, in ordine di catalogo */
  sizes: string[];
  /** "WR-22 – WR-284" */
  range: string;
  /** righe del catalogo confermate (codice, flange) */
  rows: RawProduct[];
  /** pagina dedicata della famiglia, se esiste */
  family: Family | undefined;
  /** link della card: pagina della famiglia o blocco in /prodotti */
  href: Href;
};

const range = (s: string[]) => (s.length === 1 ? s[0] : `${s[0]} – ${s[s.length - 1]}`);

/**
 * Famiglie di prodotto del catalogo ufficiale con almeno una misura confermata.
 * Una famiglia con tutte le righe «da confermare» non compare (in home né in /prodotti).
 */
export function productFamilies(locale: Locale): ProductFamily[] {
  return ORDER.flatMap((type) => {
    const rows = confirmedProducts(type);
    const set = new Set(rows.flatMap((r) => [r.wr, ...(r.wr2 ? [r.wr2] : [])]));
    const sizes = WR_LIST.filter((wr) => set.has(wr));
    if (!sizes.length) return [];
    const family = familyForType(type);
    const anchor = TYPE_PARAM[type];
    const href: Href = family ? { pathname: "/prodotti/[famiglia]", params: { famiglia: familySlug(family, locale) } } : { pathname: "/prodotti", hash: anchor };
    return [{ type, anchor, sizes, range: range(sizes), rows, family, href }];
  });
}
