import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { buildMetadata } from "@/lib/seo";
import { localizedHref } from "@/components/ui/TrackedLink";
import { SignalJourney, type JourneyText } from "@/components/journey/SignalJourney";
import { HomeNext } from "@/components/home/HomeNext";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.home" });
  return buildMetadata({ locale: locale as Locale, href: "/", title: t("title"), description: t("description") });
}

const KEYS = [
  "aria", "scroll", "skip", "hudTitle", "signal",
  "c1", "c2", "c3", "c4", "c5", "c6", "c7",
  "heroEyebrow", "heroTitle", "heroText", "fact1k", "fact1v", "fact2k", "fact2v", "fact3k", "fact3v", "iso", "heroPhotoAlt",
  "enterTitle", "enterText", "enterLegend", "rigidTitle", "rigidText",
  "bendTitle", "bendText", "bendPhotoAlt", "bendPhotoCap", "twistTitle", "twistText",
  "flexTitle", "flexText", "videoSoon", "videoSoonCap", "videoSoonAlt",
  "chainTitle", "chainText", "chainPhotoAlt", "chainPhotoCap",
  "finalTitle", "finalText", "ctaConfig", "ctaQuote", "ctaNote", "skipIntro", "replayIntro",
] as const;

/**
 * Home «Il viaggio del segnale»: un'unica esperienza a scroll in 3D (components/journey),
 * poi le sezioni della home (components/home/HomeNext: gamma, configuratore, perché, processo, CTA)
 * e il footer del sito. I testi restano sul server e arrivano al componente come stringhe.
 */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("journey");
  const footer = await getTranslations("footer");
  const text = { ...Object.fromEntries(KEYS.map((k) => [k, t(k)])), logoAlt: footer("logoAlt") } as JourneyText;

  return (
    <>
      <SignalJourney
        t={text}
        shopHref={await localizedHref("/configuratore")}
        quoteHref={await localizedHref({ pathname: "/contatti", hash: "preventivo" })}
      />
      <HomeNext />
    </>
  );
}
