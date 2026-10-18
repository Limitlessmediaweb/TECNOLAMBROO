import { ENV } from "@/data/site";
import { ConsentedAnalytics } from "./ConsentedAnalytics";

/**
 * Vercel Web Analytics (senza cookie), solo sui deploy Vercel (lo script /_vercel/insights esiste solo lì),
 * + Plausible opzionale (NEXT_PUBLIC_PLAUSIBLE_DOMAIN). Entrambi partono solo con il consenso del banner.
 */
export function Analytics() {
  return <ConsentedAnalytics vercel={Boolean(process.env.VERCEL)} plausibleDomain={ENV.plausibleDomain} />;
}
