import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { routing, type Locale } from "@/i18n/routing";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbsFor } from "@/lib/page";
import { Breadcrumbs } from "@/components/ui/Bits";
import { JsonLd } from "@/components/ui/JsonLd";
import { LocalLink as Link } from "@/components/ui/LocalLink";
import { BeforeAfter, CatalogGallery, CatalogStateBadge, RequestInfo } from "@/components/catalog/CatalogParts";
import { VISIBLE_FAMILIES, familySlug } from "@/data/families";
import { catalogTreatments, findTreatment, inLang, paragraphs, productsWithTreatment } from "@/lib/catalog";

type Props = PageProps<"/[locale]/trattamenti/[codice]">;

/** Solo i codici del CSV: gli altri indirizzi rispondono 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => catalogTreatments().map((tr) => ({ locale, codice: tr.slug })));
}

const hrefOf = (slug: string) => ({ pathname: "/trattamenti/[codice]" as const, params: { codice: slug } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, codice } = await params;
  const tr = findTreatment(codice);
  if (!tr) return {};
  const t = await getTranslations({ locale, namespace: "meta.treatments" });
  const name = inLang(tr.name, locale);
  const description = inLang(tr.description, locale);
  return buildMetadata({
    locale: locale as Locale,
    href: hrefOf(tr.slug),
    title: t("itemTitle", { name }),
    description: description ? description.slice(0, 158) : t("itemDescription", { name }),
  });
}

/** Scheda trattamento: descrizione, a cosa serve, materiali, pezzi, foto prima/dopo, richiesta informazioni. */
export default async function TreatmentPage({ params }: Props) {
  const { locale, codice } = await params;
  setRequestLocale(locale);
  const tr = findTreatment(codice);
  if (!tr) notFound();
  const t = await getTranslations("treatmentsPage");
  const items = await getTranslations("products.items");
  const name = inLang(tr.name, locale);
  const category = inLang(tr.category, locale);
  const description = paragraphs(inLang(tr.description, locale));
  const blocks = (
    [
      [t("use"), paragraphs(inLang(tr.use, locale))],
      [t("materials"), paragraphs(inLang(tr.material, locale))],
    ] as [string, string[]][]
  ).filter(([, v]) => v.length);
  const families = VISIBLE_FAMILIES.filter((f) => tr.families.includes(f.key));
  const products = productsWithTreatment(tr);

  return (
    <>
      <JsonLd
        data={await breadcrumbsFor(locale as Locale, [
          { name: t("title"), href: "/trattamenti" },
          { name, href: hrefOf(tr.slug) },
        ])}
      />

      <article className="container-site pb-24 pt-28 lg:pt-36" data-catalog-treatment={tr.code}>
        <Breadcrumbs items={[{ label: t("title"), href: "/trattamenti" }, { label: name }]} />

        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-6">
            <CatalogGallery item={tr} name={name} />
            <BeforeAfter item={tr} name={name} />
          </div>

          <div className="flex flex-col gap-6 lg:col-span-6">
            <CatalogStateBadge item={tr} />
            {category ? <p className="annot uppercase tracking-[0.14em] text-muted">{category}</p> : null}
            <h1 className="text-display-m font-extrabold [overflow-wrap:anywhere]">{name}</h1>
            {description.length ? (
              <div className="grid gap-3 text-lead text-muted">
                {description.map((para) => (
                  <p key={para}>{para}</p>
                ))}
              </div>
            ) : null}

            {blocks.map(([label, paras]) => (
              <section key={label}>
                <h2 className="annot uppercase tracking-[0.14em] text-muted">{label}</h2>
                <div className="mt-2 grid gap-2">
                  {paras.map((para) => (
                    <p key={para}>{para}</p>
                  ))}
                </div>
              </section>
            ))}

            {families.length || products.length ? (
              <section>
                <h2 className="annot uppercase tracking-[0.14em] text-muted">{products.length ? t("products") : t("appliesTo")}</h2>
                <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                  {products.map((p) => (
                    <li key={p.code}>
                      <Link
                        href={{ pathname: "/catalogo/[codice]", params: { codice: p.slug } }}
                        className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 hover:border-accent hover:text-accent"
                      >
                        {inLang(p.name, locale)}
                      </Link>
                    </li>
                  ))}
                  {families.map((f) => (
                    <li key={f.key}>
                      <Link
                        href={{ pathname: "/prodotti/[famiglia]", params: { famiglia: familySlug(f, locale) } }}
                        className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 hover:border-accent hover:text-accent"
                      >
                        {items(`${f.key}.name`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <RequestInfo code={tr.code} />

            <Link href="/trattamenti" className="tap inline-flex w-max items-center gap-2 text-sm font-semibold hover:text-accent">
              <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
              {t("back")}
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
