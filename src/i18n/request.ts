import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import { fillTokens, siteTokens } from "@/data/site";

/** Testi per lingua con i segnaposto %legalName%, %phone%, %quoteTime%… già sostituiti (vedi data/site.ts). */
const cache = new Map<string, Record<string, unknown>>();

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  let messages = cache.get(locale);
  if (!messages) {
    const raw = (await import(`../../messages/${locale}.json`)).default as Record<string, unknown>;
    messages = fillTokens(raw, siteTokens(locale));
    cache.set(locale, messages);
  }
  return { locale, messages };
});
