import { getTranslations } from "next-intl/server";
import { MessageSquareText } from "lucide-react";
import { QuoteLink } from "@/components/ui/TrackedLink";
import { SHOW_DRAFTS, stateBadge, type CatalogItem } from "@/lib/catalog";
import { CatalogPhoto } from "./CatalogPhoto";

/** Badge "Bozza" / "ESEMPIO": solo in anteprima, online quelle righe non esistono. */
export async function CatalogStateBadge({ item }: { item: CatalogItem }) {
  const kind = stateBadge(item);
  if (!kind || !SHOW_DRAFTS) return null;
  const t = await getTranslations("catalog");
  return <p className="annot w-max rounded-sm bg-todo px-2.5 py-1 text-on-todo">{t(kind)}</p>;
}

/** Galleria della scheda: la prima foto grande, le altre sotto. Senza foto, il riquadro neutro. */
export async function CatalogGallery({ item, name }: { item: CatalogItem; name: string }) {
  const t = await getTranslations("catalog");
  const photos = item.photos.length ? item.photos : [null];
  const total = item.photos.length;
  return (
    <div className="grid grid-cols-2 gap-3" data-catalog-gallery={total}>
      {photos.map((src, n) => (
        <CatalogPhoto
          key={src ?? "empty"}
          src={src}
          alt={src ? t("photoAlt", { name, n: n + 1, total }) : ""}
          code={item.code}
          priority={n === 0}
          className={n === 0 ? "col-span-2" : undefined}
          sizes={n === 0 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
        />
      ))}
    </div>
  );
}

/** Coppie prima/dopo di un trattamento (prima-1.jpg con dopo-1.jpg…). Il lato senza foto resta neutro. */
export async function BeforeAfter({ item, name }: { item: CatalogItem; name: string }) {
  const n = Math.max(item.before.length, item.after.length);
  if (!n) return null;
  const t = await getTranslations("treatmentsPage");
  return (
    <section aria-labelledby="before-after" className="mt-12">
      <h2 id="before-after" className="text-display-s font-bold">
        {t("beforeAfter")}
      </h2>
      <ul className="mt-5 grid gap-6">
        {Array.from({ length: n }, (_, i) => (
          <li key={i} className="grid grid-cols-2 gap-3" data-before-after={i + 1}>
            {[
              [item.before[i], t("before")],
              [item.after[i], t("after")],
            ].map(([src, label]) => (
              <figure key={label}>
                <CatalogPhoto src={src} alt={src ? `${name}: ${label}` : ""} code={item.code} sizes="(min-width: 1024px) 25vw, 50vw" />
                <figcaption className="annot mt-2 uppercase tracking-[0.14em] text-muted">{label}</figcaption>
              </figure>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Riquadro "Richiedi informazioni": apre il modulo contatti con il codice già nel messaggio. */
export async function RequestInfo({ code }: { code: string }) {
  const t = await getTranslations("catalog");
  return (
    <div className="flex flex-col gap-4 border border-line bg-surface p-7">
      <MessageSquareText aria-hidden="true" className="size-6 text-accent" strokeWidth={1.5} />
      <p className="text-muted">{t("requestInfoBody", { code })}</p>
      <QuoteLink source="catalog" href={{ pathname: "/contatti", query: { codice: code }, hash: "preventivo" }} className="btn btn-primary w-full sm:w-max">
        {t("requestInfo")}
      </QuoteLink>
    </div>
  );
}
