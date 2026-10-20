import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata, breadcrumbsFor } from "@/lib/page";
import { Breadcrumbs, PageHeader } from "@/components/ui/Bits";
import { JsonLd } from "@/components/ui/JsonLd";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { QuoteSection } from "@/components/sections/QuoteSection";
import { localizedHref } from "@/components/ui/TrackedLink";
import { CatalogBrowser, type BrowserItem } from "@/components/catalog/CatalogBrowser";
import { HAS_TREATMENTS, SHOW_DRAFTS, catalogTreatments, categoriesOf, categoryKey, inLang, stateBadge } from "@/lib/catalog";

/** Trattamenti di catalogo/catalogo.csv (tipo = trattamento). Senza trattamenti pubblicati la pagina non esiste (404). */
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
  const c = await getTranslations("catalog");
  const treatments = catalogTreatments();

  const items: BrowserItem[] = await Promise.all(
    treatments.map(async (tr) => {
      const badge = stateBadge(tr);
      return {
        code: tr.code,
        href: await localizedHref({ pathname: "/trattamenti/[codice]", params: { codice: tr.slug } }),
        name: inLang(tr.name, locale),
        category: inLang(tr.category, locale),
        categoryKey: categoryKey(tr),
        facts: [],
        excerpt: [inLang(tr.description, locale), inLang(tr.use, locale)].filter(Boolean).join(" "),
        image: tr.after[0] ?? tr.photos[0] ?? tr.before[0] ?? null,
        badge: badge && SHOW_DRAFTS ? c(badge) : null,
      };
    }),
  );

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
        <div className="container-site">
          <CatalogBrowser
            items={items}
            categories={categoriesOf(treatments, locale)}
            showCode={false}
            labels={{
              search: c("search"),
              searchHint: t("searchHint"),
              category: c("category"),
              all: c("all"),
              resultsOne: c.raw("resultsOne") as string,
              resultsOther: c.raw("resultsOther") as string,
              empty: t("empty"),
              reset: c("reset"),
              code: c("code"),
              open: c("open"),
            }}
          />
        </div>
      </section>

      <QuoteSection title={t("formTitle")} />
    </>
  );
}
