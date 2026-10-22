import Image from "next/image";
import { cn } from "@/lib/cn";
import { ENV } from "@/data/site";

/**
 * Foto di una scheda del catalogo. Senza foto: riquadro neutro con griglia tecnica e codice,
 * nessuna scritta "manca" (va bene anche online). Usabile da componenti server e client.
 */
export function CatalogPhoto({
  src,
  alt,
  code,
  sizes,
  priority,
  className,
  ratio = "4/3",
}: {
  src: string | null | undefined;
  alt: string;
  code?: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  ratio?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-surface-2", className)} style={{ aspectRatio: ratio }}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div aria-hidden="true" data-photo-empty className="absolute inset-0 text-line-strong">
          <svg className="absolute inset-0 size-full" preserveAspectRatio="none">
            <defs>
              <pattern id={`grid-${code ?? "x"}`} width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M24 0H0V24" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#grid-${code ?? "x"})`} />
          </svg>
          {/* sezione rettangolare di guida d'onda, a linee */}
          <svg viewBox="0 0 120 80" className="absolute left-1/2 top-1/2 w-1/3 -translate-x-1/2 -translate-y-1/2 text-muted opacity-40" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="10" y="20" width="70" height="40" />
            <path d="M10 20l30-14h70l-30 14M80 60l30-14V6" />
            <rect x="22" y="31" width="46" height="18" />
          </svg>
          {code ? <span className="annot absolute bottom-3 left-3 text-muted opacity-70">{code}</span> : null}
          {/* solo in anteprima: online il riquadro resta neutro */}
          {ENV.demo ? <span className="todo absolute left-3 right-3 top-3 text-xs">{`[DA COMPLETARE – foto/scheda: foto${code ? ` in public/foto/${code}/` : ""}]`}</span> : null}
        </div>
      )}
    </div>
  );
}
