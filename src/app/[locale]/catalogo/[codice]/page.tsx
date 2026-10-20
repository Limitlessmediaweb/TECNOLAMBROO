import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { routing, type Locale } from "@/i18n/routing";
import { COMPANY, ENV } from "@/data/site";
import { absoluteUrl, buildMetadata } from "@/lib/seo";
import { breadcrumbsFor } from "@/lib/page";
import { Breadcrumbs } from "@/components/ui/Bits";
import { JsonLd } from "@/components/ui/JsonLd";
import { LocalLink as Link } from "@/components/ui/LocalLink";
import { CatalogGallery, CatalogStateBadge, RequestInfo } from "@/components/catalog/CatalogParts";
import { catalogProducts, findProduct, inLang, paragraphs, treatmentsOf } from "@/lib/catalog";

type Props = PageProps<"/[locale]/catalogo/[codice]">;

/** Solo i codici del CSV: gli altri indirizzi rispondono 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => catalogProducts().map((p) => ({ locale, codice: p.slug })));
}

const hrefOf = (slug: string) => ({ pathname: "/catalogo/[codice]" as const, params: { codice: slug } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, codice } = await params;
  const p = findProduct(codice);
  if (!p) return {};
  const t = await getTranslations({ locale, namespace: "meta.catalog" });
  const name = inLang(p.name, locale);
  const description = inLang(p.description, locale);
  return buildMetadata({
    locale: locale as Locale,
    href: hrefOf(p.slug),
    title: t("itemTitle", { name, code: p.code }),
    description: description ? description.slice(0, 158) : t("itemDescription", { name, code: p.code }),
  });
}

/** Scheda prodotto: foto, codice, materiale, misure e norma, trattamenti disponibili, richiesta informazioni. */
export default async function CatalogItemPage({ params }: Props) {
  const { locale, codice } = await params;
  setRequestLocale(locale);
  const p = findProduct(codice);
  if (!p) notFound();
  const t = await getTranslations("catalog");
  const name = inLang(p.name, locale);
  const category = inLang(p.category, locale);
  const description = paragraphs(inLang(p.description, locale));
  const treatments = treatmentsOf(p);

  const specs: [string, string][] = (
    [
      [t("code"), p.code],
      [t("material"), inLang(p.material, locale)],
      [t("sizes"), p.sizes],
      [t("norm"), p.norm],
    ] as [string, string][]
  ).filter(([, v]) => v);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    sku: p.code,
    url: absoluteUrl(hrefOf(p.slug), locale as Locale),
    ...(description.length ? { description: description.join(" ") } : {}),
    ...(category ? { category } : {}),
    ...(p.photos.length ? { image: p.photos.map((src) => `${ENV.siteUrl}${src}`) } : {}),
    ...(inLang(p.material, locale) ? { material: inLang(p.material, locale) } : {}),
    brand: { "@type": "Brand", name: COMPANY.brand },
    manufacturer: { "@id": `${ENV.siteUrl}/#organization` },
  };

  return (
    <>
      <JsonLd
        data={await breadcrumbsFor(locale as Locale, [
          { name: t("title"), href: "/catalogo" },
          { name, href: hrefOf(p.slug) },
        ])}
      />
      <JsonLd data={jsonLd} />

      <article className="container-site pb-24 pt-28 lg:pt-36" data-catalog-product={p.code}>
        <Breadcrumbs items={[{ label: t("title"), href: "/catalogo" }, { label: name }]} />

        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-6">
            <CatalogGallery item={p} name={name} />
          </div>

          <div className="flex flex-col gap-6 lg:col-span-6">
            <CatalogStateBadge item={p} />
            {category ? <p className="annot uppercase tracking-[0.14em] text-muted">{category}</p> : null}
            <h1 className="text-display-m font-extrabold [overflow-wrap:anywhere]">{name}</h1>
            {description.length ? (
              <div className="grid gap-3 text-lead text-muted">
                {description.map((para) => (
                  <p key={para}>{para}</p>
                ))}
              </div>
            ) : null}

            <section aria-labelledby="specs-title">
              <h2 id="specs-title" className="annot uppercase tracking-[0.14em] text-muted">
                {t("specs")}
              </h2>
              <dl className="mt-3 divide-y divide-line border-y border-line">
                {specs.map(([label, value]) => (
                  <div key={label} className="grid gap-1 py-3 sm:grid-cols-3 sm:gap-4">
                    <dt className="text-muted">{label}</dt>
                    <dd className={label === t("code") ? "annot sm:col-span-2" : "sm:col-span-2"}>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {treatments.length ? (
              <section aria-labelledby="treatments-title">
                <h2 id="treatments-title" className="annot uppercase tracking-[0.14em] text-muted">
                  {t("treatments")}
                </h2>
                <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                  {treatments.map((tr) => (
                    <li key={tr.code}>
                      <Link
                        href={{ pathname: "/trattamenti/[codice]", params: { codice: tr.slug } }}
                        className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 hover:border-accent hover:text-accent"
                      >
                        {inLang(tr.name, locale)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <RequestInfo code={p.code} />

            <Link href="/catalogo" className="tap inline-flex w-max items-center gap-2 text-sm font-semibold hover:text-accent">
              <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
              {t("back")}
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
