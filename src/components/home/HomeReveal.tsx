"use client";

import { useRef, type ReactNode } from "react";
import { MQ, useLazyGSAP } from "@/lib/motion";

/**
 * Animazioni leggere delle sezioni dopo il percorso: blocchi che salgono di poco e appaiono,
 * elenchi in sequenza. Partono presto (top 90%) e durano al massimo 0,5 s: mai sezioni vuote o
 * sbiadite mentre si scorre. Solo transform/opacity, una volta sola,
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
        gsap.from(el, { y: 20, autoAlpha: 0, duration: 0.5, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 90%", once: true } });
      });
      root.querySelectorAll<HTMLElement>("[data-hx-stagger]").forEach((list) => {
        const items = list.querySelectorAll<HTMLElement>("[data-hx-item]");
        gsap.from(items, { y: 16, autoAlpha: 0, duration: 0.45, stagger: 0.05, ease: "power2.out", scrollTrigger: { trigger: list, start: "top 90%", once: true } });
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
