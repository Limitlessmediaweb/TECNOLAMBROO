"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useClientLocale, useT } from "@/lib/client-i18n";
import { whatsappHref } from "@/data/site";

/**
 * WhatsApp fisso in basso a sinistra, solo su telefono e tablet (su desktop sta in footer e contatti).
 * Unico bottone fluttuante, piccolo (40 px): compare solo arrivando in fondo alla pagina, così non copre mai il testo.
 * In fondo il footer ha lo spazio riservato (pb-[5.5rem] su telefono). Si nasconde anche con una barra
 * fissa in basso (configuratore, "La tua richiesta": html[data-fixed-bar], vedi globals.css).
 */
export function WhatsAppFloat() {
  const t = useT("common");
  const locale = useClientLocale();
  const path = usePathname();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const atBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 160;
      // compare solo in fondo alla pagina (dove il footer ha lo spazio riservato): mai sopra i contenuti
      setShown(y > 600 && atBottom);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!shown || /\/shop\/(richiesta|request)(\/|$)/.test(path)) return null;
  return (
    <a
      href={whatsappHref(locale)}
      target="_blank"
      rel="noopener"
      aria-label={t("whatsappLabel")}
      data-area="whatsapp_float"
      className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-40 grid size-10 place-items-center rounded-full bg-accent text-on-accent shadow-[0_6px_20px_var(--c-shadow)] transition-transform active:scale-95 lg:hidden"
      data-whatsapp-float
    >
      <MessageCircle aria-hidden="true" className="size-5" strokeWidth={1.75} />
    </a>
  );
}
