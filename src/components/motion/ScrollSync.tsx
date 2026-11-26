"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { loadGsap, MQ } from "@/lib/motion";

/**
 * Scroll NATIVO del browser con le animazioni GSAP sopra (27/11/2026: tolto lo smooth scroll Lenis).
 *
 * Perché: Lenis riscriveva la posizione a ogni frame verso il suo obiettivo; un tasto (frecce,
 * PagGiù, Spazio, Home/Fine) premuto mentre l'inerzia della rotella era ancora in corso veniva
 * annullato, e da fermo (intro, menu, galleria) bloccava anche i tasti. Con lo scroll nativo rotella,
 * trackpad, tastiera e touch sono quelli del sistema.
 *
 * Qui restano solo:
 *  - ScrollTrigger.refresh() quando cambia l'altezza della pagina (immagini, font, contenuti caricati
 *    dopo): i trigger delle sezioni pinnate restano allineati e non "saltano";
 *  - niente refresh per la barra degli indirizzi del telefono (ignoreMobileResize);
 *  - link interni (#sezione) con scorrimento morbido, o istantaneo con prefers-reduced-motion. La
 *    distanza dall'header è lo scroll-padding-top di html (globals.css).
 */
export function ScrollSync() {
  const pathname = usePathname();

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    void loadGsap().then(({ ScrollTrigger }) => {
      if (disposed) return;
      ScrollTrigger.config({ ignoreMobileResize: true });

      let timer: number | undefined;
      const refresh = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => ScrollTrigger.refresh(), 120);
      };
      // l'altezza del body cambia quando arrivano immagini e sezioni caricate dopo
      let lastH = document.body.scrollHeight;
      const ro = new ResizeObserver(() => {
        const h = document.body.scrollHeight;
        if (Math.abs(h - lastH) < 2) return;
        lastH = h;
        refresh();
      });
      ro.observe(document.body);
      document.fonts?.ready.then(refresh);
      if (document.readyState !== "complete") window.addEventListener("load", refresh, { once: true });

      cleanup = () => {
        window.clearTimeout(timer);
        ro.disconnect();
        window.removeEventListener("load", refresh);
      };
    });

    // link interni: scorrimento morbido fino alla sezione, poi il focus va lì (tastiera e lettori di schermo)
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href*='#']") as HTMLAnchorElement | null;
      if (!a || a.target || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || url.search !== window.location.search || !url.hash) return;
      const id = decodeURIComponent(url.hash.slice(1));
      const el = id === "top" ? document.body : document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      const reduce = window.matchMedia(MQ.reduce).matches;
      if (id === "top") window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      if (window.location.hash !== url.hash) window.history.pushState(window.history.state, "", url.hash);
      if (el !== document.body) {
        if (!el.hasAttribute("tabindex") && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.setAttribute("tabindex", "-1");
        el.focus({ preventScroll: true });
      }
    };
    document.addEventListener("click", onClick);

    return () => {
      disposed = true;
      cleanup?.();
      document.removeEventListener("click", onClick);
    };
  }, []);

  // a ogni cambio pagina i trigger si ricalcolano dopo il render
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      void loadGsap().then(({ ScrollTrigger }) => ScrollTrigger.refresh());
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return null;
}
