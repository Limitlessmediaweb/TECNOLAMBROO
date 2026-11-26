"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { Camera, Expand, LoaderCircle, RotateCcw, Ruler, Shrink } from "lucide-react";
import type { PartSpec } from "@/data/configurator/types";
import type { Accessory, ViewFocus, Viewer, ViewerLabels } from "@/lib/part3d";
import { useClientLocale, useT } from "@/lib/client-i18n";
import { num } from "@/data/waveguides";
import { fileSafe } from "@/lib/part";
import { cn } from "@/lib/cn";

/**
 * Palco 3D del configuratore premium: modello procedurale con riflessi da studio, ombra a terra,
 * etichette FLANGIA 1 / FLANGIA 2 ancorate al pezzo, quota della lunghezza e vista esplosa animata.
 * Ruota da solo, si gira con mouse e dito, riparte dopo qualche secondo di pausa. Three.js arriva con
 * import dinamico; ogni scelta aggiorna il modello senza ricaricare la scena.
 */
export type StageApi = { /** immagine PNG della vista corrente (data URL), null se il 3D non è pronto */ snapshot: () => string | null };

export function Stage3D({
  spec,
  labels,
  focus,
  code,
  className,
  accessory = null,
  api,
}: {
  spec: PartSpec;
  labels: ViewerLabels;
  focus: ViewFocus;
  code: string;
  className?: string;
  /** copertura o guarnizione da mostrare sulla flangia 1 */
  accessory?: Accessory | null;
  api?: MutableRefObject<StageApi | null>;
}) {
  const t = useT("premium");
  const locale = useClientLocale();
  const box = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | null>(null);
  const latest = useRef({ spec, labels, focus, accessory });
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [dims, setDims] = useState(true);
  const [exploded, setExploded] = useState(false);
  const [triangles, setTriangles] = useState(0);

  useEffect(() => {
    if (!box.current) return;
    let cancelled = false;
    const el = box.current;
    import("@/lib/part3d")
      .then(async ({ mountViewer }) => {
        const v = await mountViewer(el, latest.current.spec, (x) => num(x, locale, 0, 1), { autoRotate: true, shadow: true, dims: true, labels: latest.current.labels });
        if (cancelled) return v.dispose();
        viewer.current = v;
        if (latest.current.accessory) v.setSpec(latest.current.spec, latest.current.labels, latest.current.accessory);
        if (api) api.current = { snapshot: () => viewer.current?.snapshot() ?? null };
        v.setFocus(latest.current.focus);
        setTriangles(v.triangles());
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
      viewer.current?.dispose();
      viewer.current = null;
      if (api) api.current = null;
    };
  }, [locale, api]);

  // ogni scelta aggiorna il 3D (le modifiche rapide, es. una lunghezza digitata, si raggruppano)
  useEffect(() => {
    latest.current = { ...latest.current, spec, labels, accessory };
    const id = window.setTimeout(() => {
      if (!viewer.current) return;
      viewer.current.setSpec(spec, labels, accessory);
      setTriangles(viewer.current.triangles());
    }, 90);
    return () => window.clearTimeout(id);
  }, [spec, labels, accessory]);

  useEffect(() => {
    latest.current = { ...latest.current, focus };
    viewer.current?.setFocus(focus);
  }, [focus]);

  const save = () => {
    const url = viewer.current?.snapshot();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileSafe(code)}.png`;
    a.click();
  };

  const tool = "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium backdrop-blur transition-colors lg:min-h-10";
  const on = (v: boolean) => cn(tool, v ? "border-accent bg-accent text-on-accent" : "border-line-strong bg-[color-mix(in_srgb,var(--c-surface)_82%,transparent)] hover:border-accent");
  return (
    <div className={cn("p3d-stage relative overflow-hidden border border-line", className)} data-stage-state={state} data-triangles={triangles} data-exploded={exploded}>
      <div ref={box} role="img" aria-label={t("stage.aria", { code })} className="absolute inset-0 touch-pan-y" />
      {state === "loading" ? (
        <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted" role="status">
          <LoaderCircle aria-hidden="true" className="size-6 animate-spin motion-reduce:animate-none" strokeWidth={1.5} />
          <span className="sr-only">{t("stage.loading")}</span>
        </p>
      ) : null}
      {state === "error" ? (
        <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted" role="alert">
          {t("stage.error")}
        </p>
      ) : null}
      {state === "ready" ? (
        <>
          <p className="annot pointer-events-none absolute left-4 top-4 uppercase tracking-[0.16em] text-muted max-sm:hidden">{t("stage.hint")}</p>
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-2" role="toolbar" aria-label={t("stage.tools")}>
            <button
              type="button"
              aria-pressed={exploded}
              onClick={() => {
                setExploded(!exploded);
                viewer.current?.setExploded(!exploded);
              }}
              className={on(exploded)}
              data-explode
            >
              {exploded ? <Shrink aria-hidden="true" className="size-4" strokeWidth={1.75} /> : <Expand aria-hidden="true" className="size-4" strokeWidth={1.75} />}
              {exploded ? t("stage.assembled") : t("stage.exploded")}
            </button>
            <button
              type="button"
              aria-pressed={dims}
              onClick={() => {
                setDims(!dims);
                viewer.current?.setDims(!dims);
              }}
              className={on(dims)}
            >
              <Ruler aria-hidden="true" className="size-4" strokeWidth={1.75} />
              {t("stage.dims")}
            </button>
            <span className="ml-auto flex gap-2">
              <button type="button" onClick={() => viewer.current?.setView("iso")} className={cn(on(false), "px-3")} aria-label={t("stage.reset")} title={t("stage.reset")}>
                <RotateCcw aria-hidden="true" className="size-4" strokeWidth={1.75} />
              </button>
              <button type="button" onClick={save} className={cn(on(false), "px-3")} aria-label={t("stage.snapshot")} title={t("stage.snapshot")}>
                <Camera aria-hidden="true" className="size-4" strokeWidth={1.75} />
              </button>
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}
