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
import { HAS_CATALOG, SHOW_DRAFTS, catalogProducts, categoriesOf, categoryKey, inLang, stateBadge } from "@/lib/catalog";

/** Elenco dei prodotti di catalogo/catalogo.csv. Senza prodotti pubblicati la pagina non esiste (404). */
export async function generateMetadata({ params }: PageProps<"/[locale]/catalogo">): Promise<Metadata> {
  const { locale } = await params;
  if (!HAS_CATALOG) return {};
  return pageMetadata(locale, "catalog", "/catalogo");
}

export default async function CatalogPage({ params }: PageProps<"/[locale]/catalogo">) {
  const { locale } = await params;
  if (!HAS_CATALOG) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("catalog");
  const products = catalogProducts();

  const items: BrowserItem[] = await Promise.all(
    products.map(async (p) => {
      const badge = stateBadge(p);
      return {
        code: p.code,
        href: await localizedHref({ pathname: "/catalogo/[codice]", params: { codice: p.slug } }),
        name: inLang(p.name, locale),
        category: inLang(p.category, locale),
        categoryKey: categoryKey(p),
        facts: [
          { label: t("material"), value: inLang(p.material, locale) },
          { label: t("sizes"), value: p.sizes },
        ].filter((f) => f.value),
        excerpt: "",
        image: p.photos[0] ?? null,
        badge: badge && SHOW_DRAFTS ? t(badge) : null,
      };
    }),
  );

  return (
    <>
      <JsonLd data={await breadcrumbsFor(locale as Locale, [{ name: t("title"), href: "/catalogo" }])} />
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
            categories={categoriesOf(products, locale)}
            labels={{
              search: t("search"),
              searchHint: t("searchHint"),
              category: t("category"),
              all: t("all"),
              resultsOne: t.raw("resultsOne") as string,
              resultsOther: t.raw("resultsOther") as string,
              empty: t("empty"),
              reset: t("reset"),
              code: t("code"),
              open: t("open"),
            }}
          />
        </div>
      </section>

      <QuoteSection title={t("formTitle")} />
    </>
  );
}
