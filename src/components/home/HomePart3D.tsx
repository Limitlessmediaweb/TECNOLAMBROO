"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { defaultSpec } from "@/data/configurator/defaults";
import { num } from "@/data/waveguides";
import type { Viewer } from "@/lib/part3d";

/**
 * Il pezzo 3D vero del configuratore nella home (twistabile WR-90 con le due flange), che ruota da
 * solo e si gira col mouse o col dito. Three.js arriva solo quando la sezione si avvicina allo
 * schermo; fino ad allora (e senza WebGL) resta il fotogramma del configuratore.
 */
export function HomePart3D({ poster, alt, locale, hint }: { poster: string; alt: string; locale: string; hint: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let viewer: Viewer | null = null;
    let cancelled = false;
    const start = () => {
      import("@/lib/part3d")
        .then(async ({ mountViewer }) => {
          const v = await mountViewer(el, defaultSpec("twistable", "WR-90"), (x) => num(x, locale, 0, 1), { autoRotate: true, shadow: true, dims: false });
          if (cancelled) return v.dispose();
          viewer = v;
          setReady(true);
        })
        .catch(() => {
          /* senza WebGL resta il fotogramma */
        });
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          start();
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
      viewer?.dispose();
    };
  }, [locale]);

  return (
    <div className="hx-3d" data-ready={ready ? "1" : undefined}>
      <Image src={poster} alt={alt} width={1600} height={1000} sizes="(min-width: 64rem) 56vw, 92vw" className="hx-3d-poster" />
      <div ref={box} className="hx-3d-stage" role="img" aria-label={alt} />
      <span className="hx-3d-hint" aria-hidden="true">
        {hint}
      </span>
    </div>
  );
}
