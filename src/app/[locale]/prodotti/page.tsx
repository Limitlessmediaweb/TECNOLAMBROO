import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { pageMetadata, breadcrumbsFor } from "@/lib/page";
import { familyTexts } from "@/lib/families-text";
import { productFamilies } from "@/lib/product-families";
import { familySlug } from "@/data/families";
import { Breadcrumbs, PageHeader } from "@/components/ui/Bits";
import { JsonLd } from "@/components/ui/JsonLd";
import { PageMessages } from "@/components/ui/PageMessages";
import { LocalLink as Link } from "@/components/ui/LocalLink";
import { QuoteLink, localizedHref } from "@/components/ui/TrackedLink";
import { SpecTables } from "@/components/tables/SpecTables";
import { PartGlyph } from "@/components/home/PartGlyph";
import { Reveal } from "@/components/motion/Reveal";

export async function generateMetadata({ params }: PageProps<"/[locale]/prodotti">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "products", "/prodotti");
}

/**
 * Prodotti: tutte le famiglie del catalogo con almeno una misura confermata. Per ognuna descrizione
 * breve, misure disponibili, tabella (codici e flange dal catalogo ufficiale; per le flessibili anche i
 * dati elettrici) e i due bottoni «Configura» e «Chiedi preventivo». In fondo le dimensioni WR (#tabelle).
 */
export default async function ProductsPage({ params }: PageProps<"/[locale]/prodotti">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("productsPage");
  const page = await getTranslations("products.page");
  const types = await getTranslations("configurator.types");
  const families = productFamilies(locale as Locale);
  const configurePath = await localizedHref("/configuratore");
  const { names } = await familyTexts();

  return (
    <PageMessages namespaces={["tables", "configurator"]}>
      <JsonLd data={await breadcrumbsFor(locale as Locale, [{ name: page("title"), href: "/prodotti" }])} />
      <PageHeader
        crumbs={<Breadcrumbs items={[{ label: page("title") }]} />}
        title={<h1 className="text-display-l font-extrabold uppercase wdth-wide [overflow-wrap:break-word] [hyphens:auto] md:[overflow-wrap:normal] lg:text-[clamp(3rem,5.4vw,5.5rem)]">{page("title")}</h1>}
        intro={<p>{t("intro")}</p>}
      />

      {/* indice delle famiglie */}
      <nav className="container-site pb-10" aria-label={t("indexLabel")}>
        <ul className="flex flex-wrap gap-2">
          {families.map((f) => (
            <li key={f.type}>
              <a href={`#${f.anchor}`} className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-sm transition-colors hover:border-accent hover:text-accent">
                {types(`${f.type}.name`)}
              </a>
            </li>
          ))}
          <li>
            <a href="#tabelle" className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm text-muted transition-colors hover:border-accent hover:text-accent">
              {t("dimsTitle")}
            </a>
          </li>
        </ul>
      </nav>

      {families.map((f) => {
        const name = types(`${f.type}.name`);
        const pair = f.type === "transition";
        return (
          <section key={f.type} id={f.anchor} className="scroll-mt-24 border-t border-line py-14 lg:py-20" aria-labelledby={`${f.anchor}-title`} data-family-block={f.type}>
            <div className="container-site grid gap-10 lg:grid-cols-12 lg:gap-8">
              <Reveal className="grid content-start gap-5 lg:col-span-4">
                <span className="grid aspect-[4/3] max-w-[18rem] place-items-center border border-line bg-surface p-6 text-primary-ink">
                  <PartGlyph type={f.type} />
                </span>
                <h2 id={`${f.anchor}-title`} className="text-display-m font-bold">
                  {name}
                </h2>
                <p className="max-w-[44ch] text-muted">{t(`families.${f.type}`)}</p>
                <p className="annot text-primary-ink">
                  {f.range} · {t("sizes", { count: f.sizes.length })}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href={{ pathname: "/configuratore", query: { tipo: f.anchor } }} className="btn btn-primary" data-track="cta_shop_click" data-source={`products_${f.type}`}>
                    {t("configure")}
                    <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  </Link>
                  <QuoteLink source={`products_${f.type}`} href={{ pathname: "/contatti", query: { famiglia: f.family?.key ?? f.anchor }, hash: "preventivo" }} className="btn btn-ghost">
                    {t("quote")}
                  </QuoteLink>
                </div>
                {f.family ? (
                  <Link
                    href={{ pathname: "/prodotti/[famiglia]", params: { famiglia: familySlug(f.family, locale) } }}
                    className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-medium underline decoration-accent underline-offset-4 hover:text-accent"
                  >
                    {t("familyPage", { name })}
                    <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  </Link>
                ) : null}
              </Reveal>

              <div className="grid min-w-0 content-start gap-10 lg:col-span-8">
                <div className="data-table-wrap" role="region" aria-label={t("tableLabel", { name })} tabIndex={0}>
                  <table className="data-table min-w-[34rem]">
                    <caption className="sr-only">{t("tableLabel", { name })}</caption>
                    <thead>
                      <tr>
                        <th scope="col" className="sticky-col">
                          {t("colSize")}
                        </th>
                        <th scope="col">{t("colCode")}</th>
                        <th scope="col">{t("colFlanges")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {f.rows.map((r, i) => (
                        <tr key={`${r.wr}-${r.wr2 ?? ""}-${r.plane ?? ""}-${i}`}>
                          <th scope="row" className="sticky-col whitespace-nowrap font-display font-bold">
                            {pair && r.wr2 ? `${r.wr} → ${r.wr2}` : r.wr}
                            {r.plane ? <span className="annot ml-2 font-normal text-muted">{t("plane", { plane: r.plane })}</span> : null}
                          </th>
                          <td className="tabular whitespace-nowrap">{r.code ?? "—"}</td>
                          <td className="min-w-[16rem] whitespace-normal text-muted">{[...new Set([...r.flanges, ...(r.flanges2 ?? [])])].join(" · ") || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {f.type === "twistable" || f.type === "seamless" ? (
                  <SpecTables only={f.type === "twistable" ? "twist" : "seamless"} configurePath={configurePath} familyNames={names} headingLevel={3} />
                ) : null}
              </div>
            </div>
          </section>
        );
      })}

      <section id="tabelle" className="scroll-mt-24 border-t border-line py-14 lg:py-20" aria-labelledby="dims-title">
        <div className="container-site grid gap-6">
          <h2 id="dims-title" className="text-display-m font-bold">
            {t("dimsTitle")}
          </h2>
          <p className="max-w-[60ch] text-muted">{t("dimsText")}</p>
          <SpecTables only="dims" configurePath={configurePath} familyNames={names} headingLevel={3} />
        </div>
      </section>

      <section className="border-t border-line" aria-labelledby="custom-cta">
        <div className="container-site flex flex-col gap-5 py-16 md:flex-row md:items-center md:justify-between">
          <div className="grid gap-2">
            <h2 id="custom-cta" className="text-display-s font-bold">
              {t("customTitle")}
            </h2>
            <p className="max-w-[56ch] text-muted">{t("customText")}</p>
          </div>
          <Link href="/su-misura" className="btn btn-primary self-start md:self-auto">
            {t("customCta")}
            <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </Link>
        </div>
      </section>
    </PageMessages>
  );
}
