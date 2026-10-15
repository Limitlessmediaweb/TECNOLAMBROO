import type { Locale } from "@/i18n/routing";

type Text = Partial<Record<Locale, string>> & { it: string; en: string };

/**
 * Trattamenti superficiali (pagina /trattamenti). Da compilare con il titolare: quali trattamenti,
 * su quali pezzi, note. Le lingue senza testo usano l'inglese.
 *
 * FINCHÉ L'ELENCO È VUOTO la pagina non esiste: risponde 404, non è in sitemap e non compare nel menu.
 * Basta aggiungere la prima voce perché compaia ovunque (vedi docs/aggiungere-prodotti.md).
 *
 * Esempio:
 *   {
 *     key: "argentatura",
 *     name: { it: "Argentatura", en: "Silver plating" },
 *     description: { it: "Riduce le perdite …", en: "Reduces losses …" },
 *     families: ["twistable", "bends"],
 *     parts: { it: "Flange e transizioni su disegno", en: "Flanges and transitions to drawing" },
 *     notes: { it: "Spessore da definire nel preventivo.", en: "Thickness agreed in the quote." },
 *   },
 */
export type SurfaceTreatment = {
  /** identificativo, minuscolo senza spazi */
  key: string;
  name: Text;
  description?: Text;
  /** famiglie su cui si fa: chiavi di data/families.ts (twistable, seamless, bends, twists, offsets) */
  families?: readonly string[];
  /** altri pezzi su cui si fa, in testo libero */
  parts?: Text;
  notes?: Text;
};

export const SURFACE_TREATMENTS: readonly SurfaceTreatment[] = [];

/** La pagina /trattamenti esiste solo se c'è almeno un trattamento. */
export const HAS_TREATMENTS = SURFACE_TREATMENTS.length > 0;
