import Image from "next/image";
import { publicExists } from "@/lib/public-files";
import { cn } from "@/lib/cn";

/**
 * Spazi per le foto vere dell'officina (lista degli scatti in FOTO-DA-FARE.md).
 * Basta copiare il file in public/foto/officina/<id>.webp (o .jpg) e la foto prende il posto
 * dell'immagine provvisoria alla build successiva, senza toccare il codice.
 * Provvisoria: una foto già nostra (fresatura, collaudo) oppure un riquadro tecnico sobrio, mai un testo segnaposto.
 */
export type PhotoSlotId = "cnc" | "montaggio-flange" | "collaudo" | "magazzino" | "esterno-sede";

/** Foto già disponibili usate finché non arriva lo scatto definitivo. */
const PROVISIONAL: Partial<Record<PhotoSlotId, string>> = {
  cnc: "/journey/fresatura.webp",
  collaudo: "/journey/collaudo.webp",
  "montaggio-flange": "/journey/flessibili.webp",
};

function realPhoto(id: PhotoSlotId): string | null {
  for (const ext of ["webp", "jpg", "jpeg", "png"]) {
    const path = `/foto/officina/${id}.${ext}`;
    if (publicExists(path)) return path;
  }
  return null;
}

export function PhotoSlot({
  id,
  alt,
  caption,
  orientation = "landscape",
  sizes = "(min-width: 64rem) 33vw, 92vw",
  className,
}: {
  id: PhotoSlotId;
  alt: string;
  caption: string;
  orientation?: "landscape" | "portrait";
  sizes?: string;
  className?: string;
}) {
  const src = realPhoto(id) ?? PROVISIONAL[id] ?? null;
  return (
    <figure className={cn("photo-slot", className)} data-photo-slot={id} data-provisional={realPhoto(id) ? undefined : "1"}>
      <div className={cn("photo-slot-frame", orientation === "portrait" ? "aspect-[4/5]" : "aspect-[4/3]")}>
        {src ? (
          <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
        ) : (
          <div className="photo-slot-blank" role="img" aria-label={alt}>
            <svg viewBox="0 0 120 80" aria-hidden="true">
              <rect x="22" y="30" width="76" height="20" />
              <path d="M16 26v28M104 26v28M22 40h76" />
            </svg>
          </div>
        )}
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
