"use client";

import { useRef, type ReactNode } from "react";
import { MQ, useLazyGSAP } from "@/lib/motion";

/**
 * Animazioni leggere delle sezioni dopo il percorso: blocchi che salgono di poco e appaiono,
 * elenchi in sequenza, linea del processo che si disegna. Solo transform/opacity, una volta sola,
 * niente pin né scroll-jacking. Con prefers-reduced-motion (o senza JavaScript) tutto è già visibile.
 */
export function HomeReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLazyGSAP(({ gsap }) => {
    const root = ref.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add(MQ.motion, () => {
      root.querySelectorAll<HTMLElement>("[data-hx-reveal]").forEach((el) => {
        gsap.from(el, { y: 28, autoAlpha: 0, duration: 0.9, scrollTrigger: { trigger: el, start: "top 88%", once: true } });
      });
      root.querySelectorAll<HTMLElement>("[data-hx-stagger]").forEach((list) => {
        const items = list.querySelectorAll<HTMLElement>("[data-hx-item]");
        gsap.from(items, { y: 22, autoAlpha: 0, duration: 0.7, stagger: 0.07, scrollTrigger: { trigger: list, start: "top 86%", once: true } });
      });
      root.querySelectorAll<HTMLElement>("[data-hx-line]").forEach((list) => {
        gsap.fromTo(list, { "--hx-line": 0 }, { "--hx-line": 1, ease: "none", scrollTrigger: { trigger: list, start: "top 80%", end: "bottom 60%", scrub: 0.6 } });
      });
    });
    return () => mm.revert();
  }, ref);

  return (
    <div ref={ref} className="hx-root">
      {children}
    </div>
  );
}
