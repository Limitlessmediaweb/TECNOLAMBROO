"use client";

import NextLink from "next/link";
import { CustomPartForm } from "@/components/request/CustomPartForm";
import { useT } from "@/lib/client-i18n";

/**
 * «Hai un disegno? Caricalo» in fondo al configuratore (ancora #disegno): descrizione, misura, quantità
 * e file STEP, IGES, STL, PDF, DWG o DXF. Il pezzo entra nella stessa richiesta di preventivo.
 */
export function DrawingUpload({ requestPath }: { requestPath: string }) {
  const t = useT("configurator");
  return (
    <CustomPartForm
      addedNote={
        <NextLink href={requestPath} className="font-medium text-primary-ink underline underline-offset-4">
          {t("goToRequest")}
        </NextLink>
      }
    />
  );
}
