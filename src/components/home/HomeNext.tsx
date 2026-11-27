import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, ArrowUpRight, FileUp, Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { LocalLink as Link } from "@/components/ui/LocalLink";
import { PhotoSlot } from "@/components/ui/PhotoSlot";
import type { Locale } from "@/i18n/routing";
import { CERTIFICATIONS } from "@/data/certifications";
import { COMPANY, whatsappHref } from "@/data/site";
import { productFamilies } from "@/lib/product-families";
import { PartGlyph } from "./PartGlyph";
import { HomeReveal } from "./HomeReveal";
import { HomePart3D } from "./HomePart3D";
import "./home-next.css";

/** Massimo di card dei prodotti in home (le altre famiglie sono in /prodotti). */
const MAX_CARDS = 8;
const FORMATS = ["STEP", "IGES", "STL", "PDF", "DWG", "DXF"];

/**
 * Home dopo l'intro e il percorso «Segui il segnale», corta e con un solo obiettivo per sezione:
 * configurare un pezzo o chiedere un preventivo.
 *  a) prodotti  b) configuratore 3D  c) su misura  d) chi siamo  e) settori  f) preventivo
 * Tutte le sezioni sono scure come la scena (data-tone="dark": header scuro con blur).
 */
export async function HomeNext() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("homeNext");
  const types = await getTranslations("configurator.types");
  // famiglie del catalogo con almeno una misura confermata: quelle tutte «da confermare» non vanno in evidenza
  const cards = productFamilies(locale).slice(0, MAX_CARDS);
  const stats = t.raw("about.stats") as { value: string; label: string }[];
  const sectors = t.raw("sectors.items") as { title: string; text: string }[];

  return (
    <HomeReveal>
      <div className="hx" id="dopo-il-percorso" data-tone="dark">
        {/* a) Prodotti */}
        <section className="hx-section" aria-labelledby="hx-products">
          <header className="hx-head" data-hx-reveal>
            <p className="hx-eyebrow">{t("products.eyebrow")}</p>
            <h2 id="hx-products" className="hx-title">
              {t("products.title")}
            </h2>
            <p className="hx-lead">{t("products.text")}</p>
          </header>
          <ul className="hx-cards" data-hx-stagger>
            {cards.map((c) => (
              <li key={c.type} data-hx-item>
                <Link href={c.href} className="hx-card" data-track="home_family_click" data-source={c.type}>
                  <span className="hx-card-art">
                    <PartGlyph type={c.type} />
                  </span>
                  <span className="hx-card-body">
                    <span className="hx-card-name">{types(`${c.type}.name`)}</span>
                    <span className="hx-card-short">{types(`${c.type}.short`)}</span>
                    <span className="hx-card-meta">
                      <span>{c.range}</span>
                      <span aria-hidden="true">·</span>
                      <span>{t("products.sizes", { count: c.sizes.length })}</span>
                    </span>
                  </span>
                  <ArrowUpRight className="hx-card-arrow" aria-hidden="true" strokeWidth={1.5} />
                </Link>
              </li>
            ))}
          </ul>
          <p className="hx-more" data-hx-reveal>
            <Link href="/prodotti" className="hx-link">
              {t("products.all")}
              <ArrowRight aria-hidden="true" strokeWidth={1.75} />
            </Link>
          </p>
        </section>

        {/* b) Configuratore 3D: il punto dell'innovazione */}
        <section className="hx-section hx-config" aria-labelledby="hx-config">
          <div className="hx-config-copy" data-hx-reveal>
            <p className="hx-eyebrow">{t("config.eyebrow")}</p>
            <h2 id="hx-config" className="hx-title hx-title--xl">
              {t("config.title")}
            </h2>
            <p className="hx-lead">{t("config.text")}</p>
            <Link href="/configuratore" className="sj-btn sj-btn--primary hx-btn" data-track="cta_shop_click" data-source="home_config">
              {t("config.cta")}
              <ArrowRight aria-hidden="true" strokeWidth={1.75} />
            </Link>
          </div>
          <div className="hx-config-stage" data-hx-reveal>
            <HomePart3D poster={locale === "it" ? "/home/configuratore.webp" : "/home/configurator-en.webp"} alt={t("config.imgAlt")} locale={locale} hint={t("config.hint")} />
          </div>
        </section>

        {/* c) Su misura */}
        <section className="hx-section hx-custom" aria-labelledby="hx-custom">
          <div className="hx-custom-inner" data-hx-reveal>
            <FileUp className="hx-custom-icon" aria-hidden="true" strokeWidth={1.25} />
            <div>
              <p className="hx-eyebrow">{t("custom.eyebrow")}</p>
              <h2 id="hx-custom" className="hx-title">
                {t("custom.title")}
              </h2>
              <p className="hx-lead">{t("custom.text")}</p>
              <p className="hx-formats">
                <span className="sr-only">{t("custom.formatsLabel")}: </span>
                {FORMATS.map((f) => (
                  <span key={f}>{f}</span>
                ))}
              </p>
              <div className="hx-cta-row">
                <Link href={{ pathname: "/configuratore", hash: "disegno" }} className="sj-btn sj-btn--primary hx-btn" data-track="cta_drawing_click" data-source="home_custom">
                  {t("custom.cta")}
                  <ArrowRight aria-hidden="true" strokeWidth={1.75} />
                </Link>
                <Link href="/su-misura" className="hx-link">
                  {t("custom.more")}
                  <ArrowRight aria-hidden="true" strokeWidth={1.75} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* d) Chi siamo in tre numeri */}
        <section className="hx-section" aria-labelledby="hx-about">
          <header className="hx-head" data-hx-reveal>
            <p className="hx-eyebrow">{t("about.eyebrow")}</p>
            <h2 id="hx-about" className="hx-title">
              {t("about.title")}
            </h2>
            <p className="hx-lead">{t("about.text")}</p>
          </header>
          <dl className="hx-stats" data-hx-stagger>
            {stats.map((s) => (
              <div key={s.label} data-hx-item>
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
          <div className="hx-iso" data-hx-reveal>
            {CERTIFICATIONS.map((c) => (
              <Link key={c.id} href={{ pathname: "/azienda", hash: "qualita" }} className="sj-iso-badge">
                <ShieldCheck aria-hidden="true" strokeWidth={1.75} />
                {c.standard}
              </Link>
            ))}
            <Link href="/azienda" className="hx-link">
              {t("about.more")}
              <ArrowRight aria-hidden="true" strokeWidth={1.75} />
            </Link>
          </div>
          <div className="hx-photos" data-hx-stagger>
            <div data-hx-item>
              <PhotoSlot id="cnc" alt={t("about.photos.cncAlt")} caption={t("about.photos.cnc")} sizes="(min-width: 64rem) 30vw, 92vw" />
            </div>
            <div data-hx-item>
              <PhotoSlot id="montaggio-flange" alt={t("about.photos.flangesAlt")} caption={t("about.photos.flanges")} sizes="(min-width: 64rem) 30vw, 92vw" />
            </div>
            <div data-hx-item>
              <PhotoSlot id="collaudo" alt={t("about.photos.testAlt")} caption={t("about.photos.test")} sizes="(min-width: 64rem) 30vw, 92vw" />
            </div>
          </div>
        </section>

        {/* e) Settori */}
        <section className="hx-section" aria-labelledby="hx-sectors">
          <header className="hx-head" data-hx-reveal>
            <p className="hx-eyebrow">{t("sectors.eyebrow")}</p>
            <h2 id="hx-sectors" className="hx-title">
              {t("sectors.title")}
            </h2>
          </header>
          <ul className="hx-sectors" data-hx-stagger>
            {sectors.map((s) => (
              <li key={s.title} data-hx-item>
                <span className="hx-sector-name">{s.title}</span>
                <span className="hx-sector-text">{s.text}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* f) Preventivo */}
        <section className="hx-section hx-cta" aria-labelledby="hx-cta">
          <div className="hx-cta-inner" data-hx-reveal>
            <p className="hx-eyebrow">{t("cta.eyebrow")}</p>
            <h2 id="hx-cta" className="hx-title hx-title--xl">
              {t("cta.title")}
            </h2>
            <p className="hx-lead">{t("cta.text")}</p>
            <div className="hx-cta-row">
              <Link href={{ pathname: "/contatti", hash: "preventivo" }} className="sj-btn sj-btn--primary hx-btn" data-track="cta_quote_click" data-source="home_final">
                {t("cta.quote")}
                <ArrowRight aria-hidden="true" strokeWidth={1.75} />
              </Link>
              <Link href="/contatti" className="hx-link">
                {t("cta.contacts")}
                <ArrowRight aria-hidden="true" strokeWidth={1.75} />
              </Link>
            </div>
            <dl className="hx-contacts">
              <div>
                <dt>
                  <Phone aria-hidden="true" strokeWidth={1.5} />
                  {t("cta.phone")}
                </dt>
                <dd>
                  <a href={COMPANY.phoneHref} data-track="contact_phone_click" data-source="home_final">
                    {COMPANY.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt>
                  <MessageCircle aria-hidden="true" strokeWidth={1.5} />
                  WhatsApp
                </dt>
                <dd>
                  <a href={whatsappHref(locale)} target="_blank" rel="noopener" data-track="contact_whatsapp_click" data-source="home_final">
                    {COMPANY.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt>
                  <Mail aria-hidden="true" strokeWidth={1.5} />
                  {t("cta.email")}
                </dt>
                <dd>
                  <a href={`mailto:${COMPANY.email}`} data-track="contact_email_click" data-source="home_final">
                    {COMPANY.email}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
    </HomeReveal>
  );
}
