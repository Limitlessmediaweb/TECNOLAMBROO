import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Sparkles } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/i18n/locales";
import { pageMetadata, breadcrumbsFor } from "@/lib/page";
import { Breadcrumbs, PageHeader } from "@/components/ui/Bits";
import { JsonLd } from "@/components/ui/JsonLd";
import { LocalLink as Link } from "@/components/ui/LocalLink";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { QuoteSection } from "@/components/sections/QuoteSection";
import { HAS_TREATMENTS, SURFACE_TREATMENTS } from "@/data/treatments";
import { VISIBLE_FAMILIES, familySlug } from "@/data/families";

/** Trattamenti superficiali, dai dati di data/treatments.ts. Senza trattamenti la pagina non esiste (404). */
export async function generateMetadata({ params }: PageProps<"/[locale]/trattamenti">): Promise<Metadata> {
  const { locale } = await params;
  if (!HAS_TREATMENTS) return {};
  return pageMetadata(locale, "treatments", "/trattamenti");
}

export default async function TreatmentsPage({ params }: PageProps<"/[locale]/trattamenti">) {
  const { locale } = await params;
  if (!HAS_TREATMENTS) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("treatmentsPage");
  const items = await getTranslations("products.items");

  return (
    <>
      <JsonLd data={await breadcrumbsFor(locale as Locale, [{ name: t("title"), href: "/trattamenti" }])} />
      <PageHeader
        crumbs={<Breadcrumbs items={[{ label: t("title") }]} />}
        title={
          <SplitReveal as="h1" immediate className="text-display-l font-extrabold uppercase wdth-wide [overflow-wrap:break-word] [hyphens:auto] md:[overflow-wrap:normal] lg:text-[clamp(3rem,5.4vw,5.5rem)]">
            {t("title")}
          </SplitReveal>
        }
        intro={<p>{t("intro")}</p>}
      />

      <section className="section-y border-t border-line" aria-label={t("title")}>
        <ul className="container-site grid gap-4 md:grid-cols-2">
          {SURFACE_TREATMENTS.map((tr) => {
            const families = VISIBLE_FAMILIES.filter((f) => tr.families?.includes(f.key));
            const parts = tr.parts ? pick(tr.parts, locale) : null;
            return (
              <li key={tr.key} className="flex flex-col gap-4 border border-line bg-surface p-7" data-treatment={tr.key}>
                <Sparkles aria-hidden="true" className="size-6 text-accent" strokeWidth={1.5} />
                <h2 className="text-display-s font-bold">{pick(tr.name, locale)}</h2>
                {tr.description ? <p className="text-muted">{pick(tr.description, locale)}</p> : null}
                {families.length || parts ? (
                  <div>
                    <h3 className="annot uppercase tracking-[0.14em] text-muted">{t("appliesTo")}</h3>
                    <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                      {families.map((f) => (
                        <li key={f.key}>
                          <Link
                            href={{ pathname: "/prodotti/[famiglia]", params: { famiglia: familySlug(f, locale) } }}
                            className="inline-flex min-h-9 items-center rounded-full border border-line-strong px-3 hover:border-accent hover:text-accent"
                          >
                            {items(`${f.key}.name`)}
                          </Link>
                        </li>
                      ))}
                      {parts ? <li className="inline-flex min-h-9 items-center px-1 text-muted">{parts}</li> : null}
                    </ul>
                  </div>
                ) : null}
                {tr.notes ? (
                  <p className="text-sm text-muted">
                    <span className="font-semibold text-fg">{t("notes")}:</span> {pick(tr.notes, locale)}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <QuoteSection title={t("formTitle")} />
    </>
  );
}
