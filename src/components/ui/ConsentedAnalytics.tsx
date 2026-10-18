"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { CONSENT_EVENT, hasStatsConsent } from "@/lib/consent";
import { captureFirstVisit } from "@/lib/analytics";

/**
 * Statistiche e provenienza delle campagne SOLO dopo il consenso (banner cookie).
 * Se il consenso viene revocato a pagina aperta, beforeSend scarta gli eventi di Vercel; Plausible
 * (facoltativo) non si può spegnere a caldo, quindi in quel caso la pagina si ricarica.
 */
export function ConsentedAnalytics({ vercel, plausibleDomain }: { vercel: boolean; plausibleDomain: string }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let was = false;
    const sync = () => {
      const now = hasStatsConsent();
      captureFirstVisit();
      if (was && !now && plausibleDomain) window.location.reload();
      was = now;
      setAllowed(now);
    };
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, [plausibleDomain]);

  if (!allowed) return null;
  return (
    <>
      {vercel ? <VercelAnalytics beforeSend={(event) => (hasStatsConsent() ? event : null)} /> : null}
      {plausibleDomain ? (
        <>
          <Script defer data-domain={plausibleDomain} src="https://plausible.io/js/script.tagged-events.js" strategy="afterInteractive" />
          <Script id="plausible-queue" strategy="afterInteractive">
            {`window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}`}
          </Script>
        </>
      ) : null}
    </>
  );
}
