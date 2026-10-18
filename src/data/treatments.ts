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

/**
 * Compilato il 18/10/2026 solo con fatti già pubblicati nel sito: i quattro trattamenti citati in
 * processo, azienda, qualità e FAQ ("brillantatura, verniciatura, trattamenti termici e galvanici"),
 * i pezzi su cui il configuratore li offre (tutti i tipi) e le note del configuratore.
 * DA CONFERMARE CON IL TITOLARE: pezzi esclusi, trattamenti galvanici specifici (argentatura, nichel…).
 */
const ALL_FAMILIES = ["twistable", "seamless", "bends", "twists", "offsets"] as const;
const AGREE_IN_QUOTE: Text = {
  it: "Lo definiamo insieme nel preventivo.",
  en: "We’ll define it together in the quote.",
  es: "Lo definimos juntos en el presupuesto.",
  zh: "我们将在报价中与您共同确定。",
  de: "Wir legen sie gemeinsam im Angebot fest.",
};

export const SURFACE_TREATMENTS: readonly SurfaceTreatment[] = [
  {
    key: "brillantatura",
    name: { it: "Brillantatura", en: "Bright dipping", es: "Abrillantado", zh: "光亮处理", de: "Glanzbeizen" },
    families: ALL_FAMILIES,
  },
  {
    key: "verniciatura",
    name: { it: "Verniciatura", en: "Painting", es: "Pintura", zh: "喷漆", de: "Lackieren" },
    families: ALL_FAMILIES,
    notes: {
      it: "Colore e tipo di vernice li definiamo insieme nel preventivo.",
      en: "We’ll agree colour and paint type in the quote.",
      es: "El color y el tipo de pintura los acordamos en el presupuesto.",
      zh: "颜色和涂料类型将在报价中与您确定。",
      de: "Farbe und Lackart legen wir gemeinsam im Angebot fest.",
    },
  },
  {
    key: "termici",
    name: { it: "Trattamenti termici", en: "Heat treatments", es: "Tratamientos térmicos", zh: "热处理", de: "Wärmebehandlungen" },
    families: ALL_FAMILIES,
    notes: AGREE_IN_QUOTE,
  },
  {
    key: "galvanici",
    name: { it: "Trattamenti galvanici", en: "Galvanic treatments", es: "Tratamientos galvánicos", zh: "电镀处理", de: "Galvanische Behandlungen" },
    families: ALL_FAMILIES,
    notes: AGREE_IN_QUOTE,
  },
];

/** La pagina /trattamenti esiste solo se c'è almeno un trattamento. */
export const HAS_TREATMENTS = SURFACE_TREATMENTS.length > 0;
