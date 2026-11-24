import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata, breadcrumbsFor } from "@/lib/page";
import { Breadcrumbs } from "@/components/ui/Bits";
import { JsonLd } from "@/components/ui/JsonLd";
import { PageMessages } from "@/components/ui/PageMessages";
import { localizedHref } from "@/components/ui/TrackedLink";
import { PremiumConfigurator } from "@/components/configurator/premium/PremiumConfigurator";

export async function generateMetadata({ params }: PageProps<"/[locale]/configuratore">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "configurator3d", "/configuratore");
}

/**
 * Configuratore 3D premium: 7 passi (tipo, misura WR, flangia 1, flangia 2, lunghezza, finitura,
 * quantità con allegati e note) con il modello 3D che si aggiorna a ogni scelta. Nessun prezzo:
 * alla fine il pezzo entra nella richiesta di preventivo.
 */
export default async function ConfiguratorPage({ params }: PageProps<"/[locale]/configuratore">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("premium.page");
  const requestPath = await localizedHref("/shop/richiesta");

  return (
    <PageMessages namespaces={["premium", "configurator"]}>
      <JsonLd data={await breadcrumbsFor(locale as Locale, [{ name: t("eyebrow"), href: "/configuratore" }])} />
      <section className="container-site pb-16 pt-8 lg:pt-10">
        <Breadcrumbs items={[{ label: t("eyebrow") }]} />
        <header className="mb-8 mt-6 grid max-w-4xl gap-3">
          <h1 className="text-display-m font-extrabold uppercase wdth-wide">{t("title")}</h1>
          <p className="text-lead text-muted">{t("intro")}</p>
        </header>
        <PremiumConfigurator requestPath={requestPath} />
      </section>
    </PageMessages>
  );
}
