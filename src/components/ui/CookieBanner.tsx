"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import { X } from "lucide-react";
import { useT } from "@/lib/client-i18n";
import { CONSENT_OPEN_EVENT, openConsent, readConsent, saveConsent } from "@/lib/consent";

/**
 * Banner del consenso (provvedimento del Garante dell'8/10/2021): compare finché non c'è una scelta
 * valida; "Accetta" e "Rifiuta" hanno lo stesso peso, la X chiude senza accettare. Nulla di non tecnico
 * parte prima della scelta (ConsentedAnalytics). Si riapre da "Preferenze cookie" nel footer.
 */
export function CookieBanner({ policyHref }: { policyHref: string }) {
  const t = useT("consent");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // dopo l'idratazione: lo stato salvato esiste solo nel browser
    const id = window.requestAnimationFrame(() => setOpen(readConsent() === null));
    const reopen = () => setOpen(true);
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
    };
  }, []);

  // segnala il banner aperto: il pulsante WhatsApp si nasconde (globals.css)
  useEffect(() => {
    const el = document.documentElement;
    if (open) el.dataset.consentOpen = "true";
    else delete el.dataset.consentOpen;
    return () => {
      delete el.dataset.consentOpen;
    };
  }, [open]);

  if (!open) return null;
  const choose = (stats: boolean) => {
    saveConsent(stats);
    setOpen(false);
  };
  return (
    <section
      role="region"
      aria-labelledby="consent-title"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[70] mx-auto max-w-2xl rounded-md border border-line-strong bg-bg p-5 shadow-[0_16px_40px_var(--c-shadow)] sm:inset-x-6 sm:p-6"
      data-consent-banner
    >
      <div className="flex items-start gap-3">
        <h2 id="consent-title" className="min-w-0 flex-1 text-lg font-bold">
          {t("title")}
        </h2>
        <button type="button" className="-mr-2 -mt-2 grid size-11 shrink-0 place-items-center rounded-full hover:bg-surface-2" aria-label={t("close")} onClick={() => choose(false)} data-consent-close>
          <X aria-hidden="true" className="size-4" strokeWidth={1.75} />
        </button>
      </div>
      <p className="mt-2 text-sm text-muted">
        {t("body")}{" "}
        <NextLink href={policyHref} className="font-medium text-fg underline decoration-accent underline-offset-4 hover:text-accent">
          {t("policy")}
        </NextLink>
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:flex sm:justify-end">
        <button type="button" className="btn btn-ghost" onClick={() => choose(false)} data-consent-reject>
          {t("reject")}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => choose(true)} data-consent-accept>
          {t("accept")}
        </button>
      </div>
    </section>
  );
}

/** Link "Preferenze cookie" del footer: riapre il banner. */
export function ConsentPreferencesLink({ className }: { className?: string }) {
  const t = useT("consent");
  return (
    <button type="button" className={className} onClick={openConsent} data-consent-preferences>
      {t("preferences")}
    </button>
  );
}
