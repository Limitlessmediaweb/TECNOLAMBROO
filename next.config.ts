import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Al lancio (docs/messa-online.md): con CANONICAL_REDIRECT=true gli host secondari (www, il vecchio
 * tecnolambro.com e l'indirizzo *.vercel.app di produzione, in REDIRECT_HOSTS separati da virgola)
 * portano al dominio di NEXT_PUBLIC_SITE_URL con un redirect 308. Spento finché la variabile non è impostata.
 */
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tecnolambro.it").replace(/\/$/, "");
const HOST_REDIRECTS =
  process.env.CANONICAL_REDIRECT === "true"
    ? (process.env.REDIRECT_HOSTS ?? "www.tecnolambro.it,tecnolambro.com,www.tecnolambro.com,tecnolambroooo.vercel.app")
        .split(",")
        .map((h) => h.trim())
        .filter((h) => h && h !== new URL(SITE_URL).host)
        .map((host) => ({ source: "/:path*", has: [{ type: "host" as const, value: host }], destination: `${SITE_URL}/:path*`, permanent: true }))
    : [];

/**
 * CSP in due parti. Quella applicata contiene solo direttive che non possono rompere il sito
 * (niente iframe esterni, plugin, <base> o form verso altri domini). Quella "Report-Only" è la
 * politica completa: non blocca nulla, segnala in console cosa bloccherebbe. Da provare sulla
 * preview Vercel (configuratore 3D, upload su Blob, statistiche) e poi spostare nella CSP applicata.
 * 'unsafe-inline' sugli script resta finché lo script del tema e il JSON-LD non hanno nonce o hash.
 */
const CSP_ENFORCED = ["base-uri 'self'", "object-src 'none'", "frame-ancestors 'self'", "form-action 'self'", "upgrade-insecure-requests"].join("; ");
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://plausible.io",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' blob: data: https://vitals.vercel-insights.com https://plausible.io https://vercel.com https://*.blob.vercel-storage.com",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "manifest-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
].join("; ");

/**
 * Modalità anteprima (badge "Versione demo", "manca: …", note interne): solo con NEXT_PUBLIC_DEMO=true
 * esplicito, e MAI nel deploy di produzione Vercel. Calcolata qui una volta sola e inserita uguale nel
 * codice del server e del browser, così non può differire tra i due.
 */
const DEMO = process.env.NEXT_PUBLIC_DEMO === "true" && process.env.VERCEL_ENV !== "production";

/**
 * Pagine tolte nella versione finale (27/11/2026): redirect 301 alla pagina che ne ha preso il posto,
 * in tutte le lingue (italiano senza prefisso; ES, DE e ZH con gli indirizzi tradotti o inglesi).
 *  /shop (vecchio configuratore) → /configuratore · /catalogo → /prodotti · /trattamenti → /azienda#finiture
 *  /prodotti/tabelle → /prodotti · /qualita → /azienda#qualita · /faq → /contatti#faq
 * Restano /shop/richiesta e /shop/richiesta/inviata (la lista «La tua richiesta»).
 */
type Slugs = { it: string; en: string; es?: string; de?: string; zh?: string };
const LOCALE_PREFIX = { it: "", en: "/en", es: "/es", de: "/de", zh: "/zh" } as const;
const REMOVED: { from: Slugs; to: Slugs; hash?: string; children?: boolean }[] = [
  { from: { it: "/shop", en: "/shop" }, to: { it: "/configuratore", en: "/configurator", es: "/configurador", de: "/konfigurator" } },
  { from: { it: "/catalogo", en: "/catalogue", es: "/catalogo", de: "/katalog" }, to: { it: "/prodotti", en: "/products", es: "/productos", de: "/produkte" }, children: true },
  { from: { it: "/trattamenti", en: "/treatments", es: "/tratamientos", de: "/oberflaechenbehandlungen" }, to: { it: "/azienda", en: "/company", es: "/empresa", de: "/unternehmen" }, hash: "finiture", children: true },
  { from: { it: "/prodotti/tabelle", en: "/products/tables", es: "/productos/tablas", de: "/produkte/tabellen" }, to: { it: "/prodotti", en: "/products", es: "/productos", de: "/produkte" }, hash: "tabelle" },
  { from: { it: "/qualita", en: "/quality", es: "/calidad", de: "/qualitaet" }, to: { it: "/azienda", en: "/company", es: "/empresa", de: "/unternehmen" }, hash: "qualita" },
  { from: { it: "/faq", en: "/faq" }, to: { it: "/contatti", en: "/contact", es: "/contacto", de: "/kontakt" }, hash: "faq" },
];
const REMOVED_PAGES = REMOVED.flatMap(({ from, to, hash, children }) =>
  (Object.keys(LOCALE_PREFIX) as (keyof typeof LOCALE_PREFIX)[]).flatMap((l) => {
    const source = LOCALE_PREFIX[l] + (from[l] ?? from.en);
    const destination = (LOCALE_PREFIX[l] + (to[l] ?? to.en) || "/") + (hash ? `#${hash}` : "");
    const list = [{ source, destination, statusCode: 301 as const }];
    if (children) list.push({ source: `${source}/:codice*`, destination, statusCode: 301 as const });
    return list;
  }),
);

const nextConfig: NextConfig = {
  // Cartella di build alternativa (NEXT_DIST_DIR), per avviare due server di sviluppo sulla stessa copia senza che si sovrascrivano.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  env: { TL_DEMO: DEMO ? "true" : "false" },
  // Il catalogo (catalogo/catalogo.csv) si legge alla build; incluso anche nelle funzioni che rendono
  // pagine al volo (404, menu), dove serve per sapere se mostrare Catalogo e Trattamenti.
  outputFileTracingIncludes: { "/**": ["./catalogo/catalogo.csv"] },
  // Pagine tolte o rinominate (versione 2 del 7/10/2026 e versione finale del 27/11/2026): redirect permanenti 301.
  async redirects() {
    const family: [string, string][] = [
      ["/prodotti/rigida", "/prodotti/curve"],
      ["/prodotti/curve-twist-disassati", "/prodotti/curve"],
      ["/prodotti/flessibile", "/prodotti/guida-flessibile-twistabile"],
      ["/prodotti/illuminatori", "/prodotti"],
      ["/prodotti/transizioni", "/prodotti"],
      ["/prodotti/flange-e-kit", "/prodotti"],
      ["/prodotti/su-disegno", "/su-misura"],
      ["/en/products/rigid", "/en/products/bends"],
      ["/en/products/bends-twists-offsets", "/en/products/bends"],
      ["/en/products/flexible", "/en/products/twistable-flexible-waveguide"],
      ["/en/products/feed-horns", "/en/products"],
      ["/en/products/transitions", "/en/products"],
      ["/en/products/flanges-and-kits", "/en/products"],
      ["/en/products/custom-built", "/en/custom"],
      ["/shop/ordine", "/shop/richiesta"],
      ["/shop/ordine-inviato", "/shop/richiesta/inviata"],
      ["/shop/richiesta-inviata", "/shop/richiesta/inviata"],
      ["/en/shop/order", "/en/shop/request"],
      ["/en/shop/order-sent", "/en/shop/request/sent"],
      ["/en/shop/request-sent", "/en/shop/request/sent"],
      // la pagina radioamatori (10 GHz) non c'è più: porta alla WR-90 (8,2–12,5 GHz)
      ["/radioamatori", "/prodotti/guida-flessibile/wr-90"],
      ["/en/ham-radio", "/en/products/flexible-waveguide/wr-90"],
    ];
    // Vecchio sito WordPress su tecnolambro.com (pagine indicizzate al 15/10/2026, molte sono demo del tema):
    // ogni indirizzo porta alla pagina nuova più vicina invece che a una 404.
    const oldSite: [string, string][] = [
      ["/about", "/azienda"],
      ["/about-2", "/azienda"],
      ["/contact", "/contatti"],
      ["/appointment", "/contatti"],
      ["/service", "/prodotti"],
      ["/service-type", "/prodotti"],
      ["/cart", "/configuratore"],
      ["/checkout", "/configuratore"],
      ["/my-account", "/configuratore"],
      ["/wishlist", "/configuratore"],
      ["/blog", "/"],
      ["/blog-type", "/"],
      ["/pagina-di-esempio", "/"],
      ["/feed", "/"],
      ["/category/:path*", "/"],
      ["/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/:slug*", "/"],
    ];
    // Vecchie schede dello shop con i prezzi: ora c'è il configuratore
    const handles = [
      "flex-twist-wr75-600", "flex-twist-wr90-600", "bend-e-wr90-90", "bend-h-wr90-90", "twist-wr75-90", "straight-wr90-300",
      "flange-adapter-wr90", "install-kit-wr75", "transition-wr90-n", "termination-wr90", "feed-10ghz-qo100", "transition-10ghz-sma",
    ];
    return [
      ...HOST_REDIRECTS,
      ...REMOVED_PAGES,
      ...family.map(([source, destination]) => ({ source, destination, statusCode: 301 as const })),
      ...oldSite.map(([source, destination]) => ({ source, destination, statusCode: 301 as const })),
      ...handles.flatMap((h) => [
        { source: `/shop/${h}`, destination: "/configuratore", statusCode: 301 as const },
        { source: `/en/shop/${h}`, destination: "/en/configurator", statusCode: 301 as const },
      ]),
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Niente "includeSubDomains" né "preload": webmail.tecnolambro.it (Aruba) risponde solo in HTTP
          // e i browser la renderebbero irraggiungibile dopo una visita al sito (verificato il 15/10/2026).
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // "interest-cohort" non esiste più: Chrome segnalava un errore in console su ogni pagina.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Content-Security-Policy", value: CSP_ENFORCED },
          { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
