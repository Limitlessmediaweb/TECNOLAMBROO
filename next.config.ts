import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Al lancio (docs/messa-online.md): con CANONICAL_REDIRECT=true gli host secondari (www e l'indirizzo
 * *.vercel.app di produzione, in REDIRECT_HOSTS separati da virgola) portano al dominio di
 * NEXT_PUBLIC_SITE_URL con un redirect 308. Spento finché la variabile non è impostata.
 */
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tecnolambro.it").replace(/\/$/, "");
const HOST_REDIRECTS =
  process.env.CANONICAL_REDIRECT === "true"
    ? (process.env.REDIRECT_HOSTS ?? "www.tecnolambro.it,tecnolambroooo.vercel.app")
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

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Pagine tolte o rinominate nella versione 2 (riunione del 7 ottobre 2026): redirect permanenti 308.
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
    // Vecchie schede dello shop con i prezzi: ora c'è il configuratore
    const handles = [
      "flex-twist-wr75-600", "flex-twist-wr90-600", "bend-e-wr90-90", "bend-h-wr90-90", "twist-wr75-90", "straight-wr90-300",
      "flange-adapter-wr90", "install-kit-wr75", "transition-wr90-n", "termination-wr90", "feed-10ghz-qo100", "transition-10ghz-sma",
    ];
    return [
      ...HOST_REDIRECTS,
      ...family.map(([source, destination]) => ({ source, destination, permanent: true })),
      ...handles.flatMap((h) => [
        { source: `/shop/${h}`, destination: "/shop", permanent: true },
        { source: `/en/shop/${h}`, destination: "/en/shop", permanent: true },
      ]),
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Niente "preload": iscrive il dominio nella lista dei browser ed è difficile da togliere.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
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
