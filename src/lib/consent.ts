/**
 * Consenso per gli strumenti non tecnici (provvedimento del Garante dell'8 ottobre 2021 e GDPR):
 * - statistiche (Vercel Web Analytics e, se attivato, Plausible);
 * - provenienza della visita da una campagna (tl-first-visit: utm_*, gclid, fbclid).
 * Finché non c'è una scelta valida non parte nulla di tutto questo. La scelta stessa si salva nel
 * browser (memorizzazione tecnica, non serve consenso), vale 6 mesi e si cambia da "Preferenze cookie".
 */
export type ConsentChoice = { v: number; stats: boolean; at: string };

const KEY = "tl-consent";
/** Aumentare quando cambiano gli strumenti soggetti a consenso: la domanda viene riproposta. */
export const CONSENT_VERSION = 1;
const VALID_MS = 182 * 24 * 60 * 60 * 1000; // circa 6 mesi
export const CONSENT_EVENT = "tl-consent-change";
export const CONSENT_OPEN_EVENT = "tl-consent-open";

/** Scelta valida (null = da chiedere: mai data, scaduta o di una versione precedente). */
export function readConsent(): ConsentChoice | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as ConsentChoice;
    if (c.v !== CONSENT_VERSION || typeof c.stats !== "boolean" || Date.now() - Date.parse(c.at) > VALID_MS) return null;
    return c;
  } catch {
    return null;
  }
}

/** true solo con consenso dato. */
export function hasStatsConsent(): boolean {
  return readConsent()?.stats === true;
}

export function saveConsent(stats: boolean): void {
  const choice: ConsentChoice = { v: CONSENT_VERSION, stats, at: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(choice));
    // revoca: si cancella anche quanto salvato con il consenso
    if (!stats) localStorage.removeItem("tl-first-visit");
  } catch {
    // storage non disponibile: la scelta vale solo per questa pagina
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
}

/** Riapre il banner (link "Preferenze cookie" nel footer). */
export function openConsent(): void {
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}
