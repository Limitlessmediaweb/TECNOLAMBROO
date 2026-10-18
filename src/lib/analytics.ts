import { track as vercelTrack } from "@vercel/analytics";
import { hasStatsConsent } from "@/lib/consent";

/**
 * Eventi del sito: Vercel Web Analytics (senza cookie) e, se configurato, anche Plausible.
 * Regola: mai dati personali nelle proprietà degli eventi.
 */
export type AnalyticsEvent =
  | "config_start"
  | "config_type"
  | "config_step"
  | "config_3d_view"
  | "config_download"
  | "config_share"
  | "request_add"
  | "request_view"
  | "quote_submit_success"
  | "quote_submit_error"
  | "quote_3d_upload"
  | "whatsapp_click"
  | "phone_click"
  | "email_click"
  | "datasheet_download"
  | "cert_download"
  | "band_finder_use"
  | "cta_quote_click"
  | "cta_shop_click"
  | "language_switch";

type Props = Record<string, string | number | boolean>;

declare global {
  interface Window {
    plausible?: ((event: string, options?: { props?: Props }) => void) & { q?: unknown[] };
  }
}

export function track(event: AnalyticsEvent, props?: Props): void {
  // senza consenso alle statistiche nessun evento parte (lib/consent.ts)
  if (typeof window === "undefined" || !hasStatsConsent()) return;
  try {
    vercelTrack(event, props);
    window.plausible?.(event, props ? { props } : undefined);
  } catch {
    // Le statistiche non devono mai bloccare l'interfaccia.
  }
}

const UTM_KEY = "tl-first-visit";
export type FirstVisit = { utm?: Record<string, string>; referrer?: string; landing?: string; at?: string };

/** Parametri di campagna riconosciuti (devono coincidere con cleanMeta in lib/quote-schema.ts). */
export const CAMPAIGN_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"] as const;

/**
 * Salva pagina d'ingresso, referrer e parametri della campagna della prima visita, una sola volta e
 * SOLO se l'indirizzo contiene parametri di campagna (utm_*, gclid, fbclid) e SOLO con il consenso
 * alle statistiche (lib/consent.ts): senza consenso si cancella anche quanto salvato in passato.
 */
export function captureFirstVisit(): void {
  try {
    if (!hasStatsConsent()) {
      localStorage.removeItem(UTM_KEY);
      return;
    }
    const saved = firstVisit();
    if (saved?.utm) return;
    // voci salvate dalle versioni precedenti per visite senza campagna: si tolgono
    if (saved) localStorage.removeItem(UTM_KEY);
    const p = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const k of CAMPAIGN_PARAMS) {
      const v = p.get(k);
      if (v) utm[k] = v.slice(0, 120);
    }
    if (!Object.keys(utm).length) return;
    const ref = document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer.slice(0, 300) : undefined;
    const data: FirstVisit = { utm, referrer: ref, landing: window.location.pathname, at: new Date().toISOString() };
    localStorage.setItem(UTM_KEY, JSON.stringify(data));
  } catch {
    // storage non disponibile
  }
}

export function firstVisit(): FirstVisit | null {
  try {
    const raw = localStorage.getItem(UTM_KEY);
    return raw ? (JSON.parse(raw) as FirstVisit) : null;
  } catch {
    return null;
  }
}

/**
 * Provenienza della richiesta: pagina attuale + prima visita (UTM, referrer, pagina d'ingresso).
 * Senza consenso alle statistiche niente prima visita, e dalla pagina attuale si tolgono i parametri di campagna.
 */
export function requestMeta(): { page: string; landing?: string; referrer?: string; utm?: Record<string, string> } {
  if (typeof window === "undefined") return { page: "" };
  const consent = hasStatsConsent();
  const params = new URLSearchParams(window.location.search);
  if (!consent) for (const k of CAMPAIGN_PARAMS) params.delete(k);
  const query = params.toString();
  const page = window.location.pathname + (query ? `?${query}` : "");
  const fv = consent ? firstVisit() : null;
  return { page, landing: fv?.landing, referrer: fv?.referrer, utm: fv?.utm };
}
