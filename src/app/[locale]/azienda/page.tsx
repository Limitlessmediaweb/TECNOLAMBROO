import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Factory, PencilRuler, MapPin, Warehouse } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { pageMetadata, breadcrumbsFor } from "@/lib/page";
import { Breadcrumbs, PageHeader } from "@/components/ui/Bits";
import { PhotoSlot } from "@/components/ui/PhotoSlot";
import { JsonLd } from "@/components/ui/JsonLd";
import { Stagger } from "@/components/motion/Stagger";
import { Reveal } from "@/components/motion/Reveal";
import { CertificationCards } from "@/components/sections/Certifications";
import { FinalCta } from "@/components/sections/HomeSections";
import { COMPANY } from "@/data/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/azienda">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "about", "/azienda");
}

function mapsUrl(a: { street: string; postalCode: string; city: string; province: string }) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${a.street}, ${a.postalCode} ${a.city} ${a.province}`)}`;
}

/**
 * Azienda: storia di famiglia, officina e lavorazioni, #qualita (ISO 9001 e 14001, collaudo al 100%),
 * #finiture (una riga per lavorazione) e sedi. Gli spazi foto aspettano gli scatti di FOTO-DA-FARE.md.
 */
export default async function AboutPage({ params }: PageProps<"/[locale]/azienda">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("aboutPage");
  const nav = await getTranslations("nav");
  const common = await getTranslations("common");
  const work = [
    { icon: PencilRuler, title: t("officeTitle"), body: t("officeBody") },
    { icon: Factory, title: t("productionTitle"), body: t("productionBody") },
    { icon: Warehouse, title: t("stockTitle"), body: t("stockBody") },
  ];
  const finishes = t.raw("finishes") as { name: string; text: string }[];
  const sites = [
    { label: t("operational"), address: COMPANY.operationalAddress, main: true },
    { label: t("legal"), address: COMPANY.legalAddress, main: false },
  ];

  return (
    <>
      <JsonLd data={await breadcrumbsFor(locale as Locale, [{ name: nav("about"), href: "/azienda" }])} />
      <PageHeader
        crumbs={<Breadcrumbs items={[{ label: nav("about") }]} />}
        title={<h1 className="max-w-[16ch] text-display-l font-extrabold uppercase wdth-wide [overflow-wrap:break-word] [hyphens:auto] md:[overflow-wrap:normal] lg:text-[clamp(3rem,5.4vw,5.5rem)]">{t("title")}</h1>}
        intro={<p>{t("intro")}</p>}
      />

      {/* Storia di famiglia */}
      <section className="section-y border-t border-line" aria-labelledby="family-title">
        <div className="container-site grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-12">
          <Reveal className="grid gap-5 lg:col-span-5">
            <h2 id="family-title" className="text-display-l font-bold">
              {t("familyTitle")}
            </h2>
            <p className="text-lead text-muted">{t("familyBody")}</p>
            <p className="text-muted">{t("familyBody2")}</p>
          </Reveal>
          <div className="lg:col-span-7">
            <PhotoSlot id="esterno-sede" alt={t("photos.siteAlt")} caption={t("photos.site")} sizes="(min-width: 64rem) 55vw, 92vw" />
          </div>
        </div>
      </section>

      {/* Officina e lavorazioni */}
      <section className="section-y border-t border-line" aria-labelledby="workshop-title">
        <div className="container-site">
          <h2 id="workshop-title" className="text-display-l font-bold">
            {t("workshopTitle")}
          </h2>
          <p className="mt-4 max-w-[60ch] text-lead text-muted">{t("workshopBody")}</p>
          <Stagger className="mt-10 grid gap-px border border-line bg-line md:grid-cols-3">
            {work.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex flex-col gap-4 bg-bg p-7">
                <Icon aria-hidden="true" className="size-7 text-accent" strokeWidth={1.5} />
                <h3 className="text-display-s font-bold">{title}</h3>
                <p className="text-muted">{body}</p>
              </div>
            ))}
          </Stagger>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <PhotoSlot id="cnc" alt={t("photos.cncAlt")} caption={t("photos.cnc")} />
            <PhotoSlot id="montaggio-flange" alt={t("photos.flangesAlt")} caption={t("photos.flanges")} provisionalCaption={t("photos.flangesProvisional")} />
            <PhotoSlot id="magazzino" alt={t("photos.stockAlt")} caption={t("photos.stock")} />
          </div>
        </div>
      </section>

      {/* Qualità */}
      <section id="qualita" className="section-y scroll-mt-20 border-t border-line" aria-labelledby="quality-title">
        <div className="container-site grid gap-10">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-12">
            <div className="grid content-start gap-5 lg:col-span-6">
              <h2 id="quality-title" className="text-display-l font-bold">
                {t("qualityTitle")}
              </h2>
              <p className="text-lead text-muted">{t("qualityBody")}</p>
              <div className="border-l-2 border-accent pl-5">
                <h3 className="text-display-s font-bold">{t("labTitle")}</h3>
                <p className="mt-2 text-muted">{t("testBody")}</p>
              </div>
            </div>
            <div className="lg:col-span-6">
              <PhotoSlot id="collaudo" alt={t("photos.testAlt")} caption={t("photos.test")} sizes="(min-width: 64rem) 45vw, 92vw" />
            </div>
          </div>
          <CertificationCards />
        </div>
      </section>

      {/* Finiture e trattamenti */}
      <section id="finiture" className="section-y scroll-mt-20 border-t border-line" aria-labelledby="finish-title">
        <div className="container-site grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="grid content-start gap-4 lg:col-span-5">
            <h2 id="finish-title" className="text-display-l font-bold">
              {t("finishTitle")}
            </h2>
            <p className="text-lead text-muted">{t("finishBody")}</p>
          </div>
          <dl className="grid border-t border-line lg:col-span-7">
            {finishes.map((f) => (
              <div key={f.name} className="grid gap-1 border-b border-line py-5 sm:grid-cols-[14rem_1fr] sm:gap-6">
                <dt className="font-display text-lg font-bold">{f.name}</dt>
                <dd className="text-muted">{f.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Sedi */}
      <section className="section-y border-t border-line" aria-labelledby="sites-title">
        <div className="container-site">
          <h2 id="sites-title" className="text-display-l font-bold">
            {t("sitesTitle")}
          </h2>
          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {sites.map(({ label, address, main }) => (
              <li key={label} className={main ? "flex flex-col gap-3 border border-accent/50 bg-surface p-7" : "flex flex-col gap-3 border border-line p-7"}>
                <MapPin aria-hidden="true" className="size-6 text-accent" strokeWidth={1.5} />
                <h3 className="text-display-s font-bold">{label}</h3>
                <address className="not-italic text-muted">
                  {address.street}
                  <br />
                  {address.postalCode} {address.city} ({address.province})
                </address>
                {/* La mappa solo per la sede operativa: la sede legale non riceve visite */}
                {main ? (
                  <a href={mapsUrl(address)} target="_blank" rel="noopener" className="mt-2 self-start text-sm underline decoration-accent underline-offset-4 hover:text-accent">
                    {t("mapLink")}
                    <span className="sr-only"> {common("opensNewTab")}</span>
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
