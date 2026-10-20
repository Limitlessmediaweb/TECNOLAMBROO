"use client";

import { useEffect, useId, useMemo, useState } from "react";
import NextLink from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { CatalogPhoto } from "./CatalogPhoto";

export type BrowserItem = {
  code: string;
  href: string;
  name: string;
  category: string;
  categoryKey: string;
  /** righe brevi sotto il nome (es. materiale, misure) */
  facts: { label: string; value: string }[];
  excerpt: string;
  image: string | null;
  /** badge di bozza o esempio (solo anteprima) */
  badge: string | null;
};

export type BrowserLabels = {
  search: string;
  searchHint: string;
  category: string;
  all: string;
  resultsOne: string;
  resultsOther: string;
  empty: string;
  reset: string;
  code: string;
  open: string;
};

/** minuscolo e senza accenti, per una ricerca che perdona */
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Elenco del catalogo (prodotti o trattamenti) con filtro per categoria e ricerca libera.
 * Filtro e ricerca restano nell'indirizzo (?categoria=…&q=…): il link si può condividere.
 */
export function CatalogBrowser({
  items,
  categories,
  labels,
  showCode = true,
}: {
  items: BrowserItem[];
  categories: { key: string; label: string }[];
  labels: BrowserLabels;
  showCode?: boolean;
}) {
  const id = useId();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  // finché i filtri del link non sono letti, l'indirizzo non si riscrive
  const [ready, setReady] = useState(false);

  // filtri da un link condiviso (la pagina è statica: si leggono nel browser)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const p = new URLSearchParams(window.location.search);
      const c = p.get("categoria");
      if (c && categories.some((x) => x.key === c)) setCat(c);
      if (p.get("q")) setQ(p.get("q")!.slice(0, 80));
      setReady(true);
    });
    return () => window.clearTimeout(timer);
  }, [categories]);

  useEffect(() => {
    if (!ready) return;
    const url = new URL(window.location.href);
    if (cat) url.searchParams.set("categoria", cat);
    else url.searchParams.delete("categoria");
    if (q.trim()) url.searchParams.set("q", q.trim());
    else url.searchParams.delete("q");
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);
  }, [q, cat, ready]);

  const index = useMemo(() => items.map((i) => norm([i.name, i.code, i.category, i.excerpt, ...i.facts.map((f) => f.value)].join(" "))), [items]);
  const words = norm(q).split(/\s+/).filter(Boolean);
  const shown = items.filter((i, n) => (!cat || i.categoryKey === cat) && words.every((w) => index[n].includes(w)));
  const count = (shown.length === 1 ? labels.resultsOne : labels.resultsOther).replace("{n}", String(shown.length));

  return (
    <div>
      <div className="flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full max-w-md">
          <label htmlFor={`${id}-q`} className="field-label">
            {labels.search}
          </label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
            <input id={`${id}-q`} type="search" className="input pl-11" value={q} onChange={(e) => setQ(e.target.value)} placeholder={labels.searchHint} autoComplete="off" enterKeyHint="search" />
          </div>
        </div>
        {categories.length > 1 ? (
          <div role="group" aria-label={labels.category} className="flex flex-wrap gap-2">
            {[{ key: null, label: labels.all }, ...categories].map((c) => (
              <button
                key={c.key ?? "all"}
                type="button"
                aria-pressed={cat === c.key}
                onClick={() => setCat(c.key)}
                className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-sm hover:border-accent hover:text-accent aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-on-accent"
                data-catalog-category={c.key ?? "all"}
              >
                {c.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <p className="mt-5 text-sm text-muted" aria-live="polite" data-catalog-count>
        {count}
      </p>

      {shown.length ? (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((i) => (
            <li key={i.code} data-catalog-item={i.code}>
              <NextLink href={i.href} className="group flex h-full flex-col border border-line bg-surface transition-colors hover:border-accent">
                <CatalogPhoto src={i.image} alt="" code={i.code} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" />
                <div className="flex flex-1 flex-col gap-3 p-6">
                  {i.badge ? <span className="annot w-max rounded-sm bg-todo px-2 py-0.5 text-on-todo">{i.badge}</span> : null}
                  {i.category ? <p className="annot uppercase tracking-[0.14em] text-muted">{i.category}</p> : null}
                  <h2 className="text-xl font-bold group-hover:text-accent">{i.name}</h2>
                  {showCode ? (
                    <p className="text-sm">
                      <span className="text-muted">{labels.code}</span> <span className="annot">{i.code}</span>
                    </p>
                  ) : null}
                  {i.facts.length ? (
                    <dl className="grid gap-1 text-sm">
                      {i.facts.map((f) => (
                        <div key={f.label} className="flex gap-2">
                          <dt className="shrink-0 text-muted">{f.label}</dt>
                          <dd className="min-w-0">{f.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {i.excerpt ? <p className="line-clamp-3 text-sm text-muted">{i.excerpt}</p> : null}
                  <span className="mt-auto inline-flex items-center gap-2 pt-2 text-sm font-semibold text-accent">
                    {labels.open}
                    <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" strokeWidth={1.75} />
                  </span>
                </div>
              </NextLink>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 flex flex-col items-start gap-4 border border-line bg-surface p-7">
          <p>{labels.empty}</p>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setQ("");
              setCat(null);
            }}
          >
            {labels.reset}
          </button>
        </div>
      )}
    </div>
  );
}
