import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, ArrowUpRight, Mail, Phone } from "lucide-react";
import { LocalLink as Link } from "@/components/ui/LocalLink";
import type { Href } from "@/components/ui/TrackedLink";
import { stripPlaceholders } from "@/components/ui/Bits";
import type { Locale } from "@/i18n/routing";
import type { PartType } from "@/data/configurator/types";
import { SHOW_TBC, catalogProduct, catalogSizes } from "@/data/catalogo";
import { WR_LIST } from "@/data/waveguides";
import { familyForType, familySlug } from "@/data/families";
import { COMPANY, ENV } from "@/data/site";
import { PartGlyph } from "./PartGlyph";
import { HomeReveal } from "./HomeReveal";
import "./home-next.css";

/** Ordine delle famiglie nella home: dalla guida rigida agli accessori. */
const ORDER: PartType[] = ["straight", "twistable", "seamless", "bend", "twist", "offset", "transition", "termination", "pressure", "spacer"];

type Card = { type: PartType; sizes: string[]; tbc: boolean; href: Href };

/** Famiglie presenti nel catalogo di questa build (in produzione solo le righe confermate). */
function catalogCards(locale: Locale): Card[] {
  return ORDER.flatMap((type) => {
    const set = new Set(type === "bend" ? [...catalogSizes("bend", "E"), ...catalogSizes("bend", "H")] : catalogSizes(type));
    const sizes = WR_LIST.filter((wr) => set.has(wr));
    if (!sizes.length) return [];
    const rows = sizes.flatMap((wr) => (type === "bend" ? [catalogProduct(type, wr, "E"), catalogProduct(type, wr, "H")] : [catalogProduct(type, wr)])).filter(Boolean);
    const tbc = rows.every((r) => r!.status === "tbc");
    const family = familyForType(type);
    const href: Href = family ? { pathname: "/prodotti/[famiglia]", params: { famiglia: familySlug(family, locale) } } : "/prodotti";
    return [{ type, sizes, tbc, href }];
  });
}

/** Segnaposto [DA CONFERMARE …]: evidenziati in anteprima, tolti nella versione pubblica. */
const TODO_SPLIT = /(\[(?:DA COMPLETARE|DA CONFERMARE|TO BE COMPLETED)[^\]]*\])/g;
function Todo({ text }: { text: string }) {
  if (!(ENV.demo || SHOW_TBC)) return <>{stripPlaceholders(text)}</>;
  return (
    <>
      {text.split(TODO_SPLIT).map((part, i) =>
        /^\[(DA |TO BE )/.test(part) ? (
          <mark key={i} className="hx-todo">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

const range = (s: string[]) => (s.length === 1 ? s[0] : `${s[0]} – ${s[s.length - 1]}`);
const two = (n: number) => String(n).padStart(2, "0");

/**
 * Sezioni della home dopo il percorso «Il viaggio del segnale»: gamma (dal catalogo ufficiale),
 * configuratore, perché Tecnolambro, processo e CTA finale. Stessi colori e font della scena,
 * animazioni leggere con GSAP (HomeReveal) e nessuna dipendenza dal 3D.
 */
export async function HomeNext() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("homeNext");
  const types = await getTranslations("configurator.types");
  const cards = catalogCards(locale);
  const steps = t.raw("config.steps") as string[];
  const why = t.raw("why.items") as { title: string; text: string }[];
  const sectors = t.raw("why.sectors") as { title: string; text: string }[];
  const process = t.raw("process.steps") as { title: string; text: string }[];

  return (
    <HomeReveal>
      <div className="hx" id="dopo-il-percorso">
        {/* Gamma */}
        <section className="hx-section" aria-labelledby="hx-products">
          <header className="hx-head" data-hx-reveal>
            <p className="hx-eyebrow">
              <span className="hx-eyebrow-n">08</span>
              {t("products.eyebrow")}
            </p>
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
                      <span>{range(c.sizes)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{t("products.sizes", { count: c.sizes.length })}</span>
                    </span>
                    {c.tbc && SHOW_TBC ? <span className="hx-badge">{t("products.tbc")}</span> : null}
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

        {/* Configuratore */}
        <section className="hx-section hx-config" aria-labelledby="hx-config">
          <div className="hx-config-copy" data-hx-reveal>
            <p className="hx-eyebrow">
              <span className="hx-eyebrow-n">09</span>
              {t("config.eyebrow")}
            </p>
            <h2 id="hx-config" className="hx-title">
              {t("config.title")}
            </h2>
            <p className="hx-lead">{t("config.text")}</p>
            <ol className="hx-steps">
              {steps.map((s, i) => (
                <li key={s}>
                  <span className="hx-steps-n">{two(i + 1)}</span>
                  {s}
                </li>
              ))}
            </ol>
            <Link href="/configuratore" className="sj-btn sj-btn--primary hx-btn" data-track="cta_shop_click" data-source="home_config">
              {t("config.cta")}
              <ArrowRight aria-hidden="true" strokeWidth={1.75} />
            </Link>
          </div>
          <figure className="hx-shot" data-hx-reveal>
            <div className="hx-shot-frame">
              {/* fotogramma vero del configuratore (etichette in italiano o in inglese) */}
              <Image src={locale === "it" ? "/home/configuratore.webp" : "/home/configurator-en.webp"} alt={t("config.imgAlt")} width={1600} height={1000} sizes="(min-width: 64rem) 46vw, 92vw" />
              <span className="hx-shot-corner hx-shot-corner--tl" aria-hidden="true" />
              <span className="hx-shot-corner hx-shot-corner--br" aria-hidden="true" />
            </div>
            <figcaption>{t("config.caption")}</figcaption>
          </figure>
        </section>

        {/* Perché Tecnolambro */}
        <section className="hx-section" aria-labelledby="hx-why">
          <header className="hx-head" data-hx-reveal>
            <p className="hx-eyebrow">
              <span className="hx-eyebrow-n">10</span>
              {t("why.eyebrow")}
            </p>
            <h2 id="hx-why" className="hx-title">
              {t("why.title")}
            </h2>
          </header>
          <ul className="hx-why" data-hx-stagger>
            {why.map((w) => (
              <li key={w.title} data-hx-item>
                <h3 className="hx-h3">{w.title}</h3>
                <p>
                  <Todo text={w.text} />
                </p>
              </li>
            ))}
          </ul>
          <h3 className="hx-sub" data-hx-reveal>
            {t("why.sectorsTitle")}
          </h3>
          <ul className="hx-sectors" data-hx-stagger>
            {sectors.map((s) => {
              const text = ENV.demo || SHOW_TBC ? s.text : stripPlaceholders(s.text);
              return (
                <li key={s.title} data-hx-item>
                  <span className="hx-sector-name">{s.title}</span>
                  {text ? (
                    <span className="hx-sector-text">
                      <Todo text={s.text} />
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Processo */}
        <section className="hx-section" aria-labelledby="hx-process">
          <header className="hx-head" data-hx-reveal>
            <p className="hx-eyebrow">
              <span className="hx-eyebrow-n">11</span>
              {t("process.eyebrow")}
            </p>
            <h2 id="hx-process" className="hx-title">
              {t("process.title")}
            </h2>
          </header>
          <ol className="hx-process" data-hx-stagger data-hx-line>
            {process.map((p, i) => (
              <li key={p.title} data-hx-item>
                <span className="hx-process-n" aria-hidden="true">
                  {two(i + 1)}
                </span>
                <h3 className="hx-h3">{p.title}</h3>
                <p>
                  <Todo text={p.text} />
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* CTA finale */}
        <section className="hx-section hx-cta" aria-labelledby="hx-cta">
          <div className="hx-cta-inner" data-hx-reveal>
            <p className="hx-eyebrow">
              <span className="hx-eyebrow-n">12</span>
              {t("cta.eyebrow")}
            </p>
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
