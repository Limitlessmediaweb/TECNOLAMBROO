"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * Entrata delle sezioni dopo il percorso: ogni blocco appare (max 0,5 s) appena il suo bordo
 * superiore entra nel 90% dello schermo, una volta sola. Niente ScrollTrigger né pin: il controllo
 * usa la posizione reale a ogni scroll, quindi nulla resta nascosto dopo salti o scroll veloci.
 * Con prefers-reduced-motion (o senza JavaScript) tutto è subito visibile e non c'è animazione.
 */
export function HomeReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const html = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const targets = reduced ? [] : Array.from(root.querySelectorAll<HTMLElement>("[data-hx-reveal], [data-hx-stagger]"));
    if (!reduced) root.classList.add("hx-js");
    let pending = targets.filter((el) => !el.classList.contains("is-in"));
    let raf = 0;

    const check = () => {
      raf = 0;
      const limit = window.innerHeight * 0.9;
      pending = pending.filter((el) => {
        if (el.getBoundingClientRect().top < limit) {
          el.classList.add("is-in");
          return false;
        }
        return true;
      });
      // header scuro finché sotto di lui c'è una sezione scura (le sezioni dopo il percorso)
      const r = root.getBoundingClientRect();
      const under = r.top < 40 && r.bottom > 40;
      if (under !== (html.dataset.hxHeader === "on")) {
        if (under) html.dataset.hxHeader = "on";
        else delete html.dataset.hxHeader;
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };

    check(); // prima del paint: quello già in vista non lampeggia
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", schedule);
    // rete di sicurezza: dopo layout tardivi (font, immagini) ricontrolla
    const late = [300, 1200, 3000].map((ms) => window.setTimeout(schedule, ms));
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", schedule);
      late.forEach(clearTimeout);
      if (raf) cancelAnimationFrame(raf);
      root.classList.remove("hx-js");
      delete html.dataset.hxHeader;
    };
  }, []);

  return (
    <div ref={ref} className="hx-root">
      {children}
    </div>
  );
}
