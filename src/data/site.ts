import { intlLocale, pick, type Locale } from "@/i18n/locales";

/*
 * DATI DA CAMBIARE IN UN SOLO PUNTO (docs/dati-centralizzati.md).
 * Ragione sociale, PEC, cellulare/WhatsApp, orari e tempo di risposta del preventivo compaiono in
 * pagine, testi delle 5 lingue (segnaposto %legalName%, %pec%, %phone%, %quoteTime%…, vedi siteTokens),
 * email al cliente e dati strutturati: si leggono tutti da qui.
 */
const LEGAL_NAME = "Tecnolambro S.a.s. di Pasquini Marco & C.";
const LEGAL_NAME_SHORT = "Tecnolambro S.a.s.";
const PEC = "tecnolambrosnc@pec.it";
/** Cellulare: primo numero mostrato e numero WhatsApp */
const MOBILE = "+39 375 577 1084";
/** Ore entro cui arriva il preventivo (per lingua: "24 ore", "24 ore lavorative", "24 h") */
export const QUOTE_REPLY_HOURS = 24;

const telHref = (n: string) => `tel:${n.replace(/[^\d+]/g, "")}`;

/** Dati aziendali veri (dal brief). Non aggiungere dati non forniti dal titolare. */
export const COMPANY = {
  brand: "Tecnolambro",
  brandFull: "Tecnolambro Microwave Components",
  legalName: LEGAL_NAME,
  legalNameShort: LEGAL_NAME_SHORT,
  vat: "08639310153",
  vatFull: "IT08639310153",
  founded: 1987,
  email: "info@tecnolambro.it",
  pec: PEC,
  /** Cellulare: il primo numero da mostrare */
  phone: MOBILE,
  phoneHref: telHref(MOBILE),
  /** Fisso: secondo numero */
  phone2: "+39 0382 75385",
  phone2Href: "tel:+39038275385",
  /** WhatsApp sul cellulare */
  whatsapp: MOBILE.replace(/\D/g, ""),
  /**
   * Orari della sede operativa (lunedì-venerdì 8:00-12:00 e 13:30-17:30, sabato e domenica chiuso).
   * Giorni ISO: 1 = lunedì. I testi degli orari in tutte le lingue si generano da qui (officeHoursText).
   */
  hours: [
    { days: [1, 2, 3, 4, 5], opens: "08:00", closes: "12:00" },
    { days: [1, 2, 3, 4, 5], opens: "13:30", closes: "17:30" },
  ],
  legalAddress: {
    street: "Via Privata delle Betulle 1",
    postalCode: "20078",
    city: "San Colombano al Lambro",
    province: "MI",
    region: "Lombardia",
    country: "IT",
  },
  operationalAddress: {
    street: "Via degli Spinedi 20",
    postalCode: "27010",
    city: "Miradolo Terme",
    province: "PV",
    region: "Lombardia",
    country: "IT",
  },
} as const;

/** Testo precompilato di WhatsApp, nella lingua del sito. */
export const WHATSAPP_TEXT = {
  it: "Buongiorno, vorrei informazioni su una guida d’onda",
  en: "Hello, I’d like information about a waveguide",
  es: "Buenos días, quisiera información sobre una guía de ondas",
  zh: "您好，我想了解波导产品的信息",
  de: "Guten Tag, ich hätte gerne Informationen zu einem Hohlleiter",
} as const;

export function whatsappHref(locale: string): string {
  return `https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent(pick(WHATSAPP_TEXT, locale))}`;
}

/* --------------------------------------------- tempo di risposta del preventivo */

const QUOTE_TIME_FORMS: Record<Locale, { plain: string; working: string; short: string }> = {
  it: { plain: "{h} ore", working: "{h} ore lavorative", short: "{h} h" },
  en: { plain: "{h} hours", working: "{h} working hours", short: "{h} h" },
  es: { plain: "{h} horas", working: "{h} horas laborables", short: "{h} h" },
  zh: { plain: "{h}小时", working: "{h}个工作小时", short: "{h}小时" },
  de: { plain: "{h} Stunden", working: "{h} Arbeitsstunden", short: "{h} h" },
};

/** "24 ore" · "24 ore lavorative" · "24 h" nella lingua indicata. */
export function quoteTime(locale: string, form: "plain" | "working" | "short" = "plain"): string {
  return pick(QUOTE_TIME_FORMS, locale)[form].replace("{h}", String(QUOTE_REPLY_HOURS));
}

/* --------------------------------------------------------- orari dell'ufficio */

/** Nome del giorno ISO (1 = lunedì) nella lingua indicata. */
function dayName(day: number, locale: string, style: "long" | "short"): string {
  // 1 gennaio 2024 era un lunedì
  return new Intl.DateTimeFormat(intlLocale(locale), { weekday: style, timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, day)));
}

const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);
const hhmm = (t: string) => t.replace(/^0(\d)/, "$1");

/**
 * Testi degli orari generati da COMPANY.hours:
 * days "Lunedì–venerdì" · hours "8:00–12:00 e 13:30–17:30" · closed "Sabato e domenica".
 */
export function officeHoursText(locale: string): { days: string; hours: string; closed: string } {
  const zh = locale === "zh";
  const style = zh ? "short" : "long";
  const open = [...new Set(COMPANY.hours.flatMap((h) => h.days as readonly number[]))].sort((a, b) => a - b);
  const first = dayName(open[0], locale, style);
  const last = dayName(open[open.length - 1], locale, style);
  const days = open.length === 1 ? capitalize(first) : zh ? `${first}至${last}` : `${capitalize(first)}–${last}`;
  const list = new Intl.ListFormat(intlLocale(locale), { type: "conjunction" });
  const ranges = [...new Set(COMPANY.hours.map((h) => `${hhmm(h.opens)}–${hhmm(h.closes)}`))];
  const closed = [1, 2, 3, 4, 5, 6, 7].filter((d) => !open.includes(d)).map((d) => dayName(d, locale, style));
  return { days, hours: list.format(ranges), closed: closed.length ? capitalize(list.format(closed)) : "" };
}

/* ------------------------------------------------- segnaposto nei testi tradotti */

/**
 * Valori dei segnaposto %nome% usati in messages/*.json, sostituiti al caricamento dei testi
 * (src/i18n/request.ts). Così ragione sociale, PEC, cellulare, orari e tempo di risposta restano scritti
 * una volta sola, qui sopra.
 */
export function siteTokens(locale: string): Record<string, string> {
  const office = officeHoursText(locale);
  return {
    legalName: COMPANY.legalName,
    legalNameShort: COMPANY.legalNameShort,
    pec: COMPANY.pec,
    phone: COMPANY.phone,
    quoteTime: quoteTime(locale, "plain"),
    quoteTimeWorking: quoteTime(locale, "working"),
    quoteTimeShort: quoteTime(locale, "short"),
    officeDays: office.days,
    officeHours: office.hours,
    closedDays: office.closed,
  };
}

/** Sostituisce i segnaposto %nome% in tutte le stringhe di un oggetto di testi (copia, non modifica l'originale). */
export function fillTokens<T>(value: T, tokens: Record<string, string>): T {
  if (typeof value === "string") return value.replace(/%([a-zA-Z]+)%/g, (all, name: string) => tokens[name] ?? all) as T;
  if (Array.isArray(value)) return value.map((v) => fillTokens(v, tokens)) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fillTokens(v, tokens)])) as T;
  return value;
}

/** Anni di attività calcolati dall'anno corrente (fondazione 1987). */
export function yearsActive(now = new Date()): number {
  return now.getFullYear() - COMPANY.founded;
}

export const ENV = {
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tecnolambro.it").replace(/\/$/, ""),
  allowIndexing: process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true",
  plausibleDomain: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? "",
  limitlessUrl: process.env.NEXT_PUBLIC_LIMITLESS_URL ?? "https://www.limitlessmedia.it",
  /** Anteprima: vedi next.config.ts (false se NEXT_PUBLIC_DEMO manca, sempre false in produzione) */
  demo: process.env.TL_DEMO === "true",
} as const;
