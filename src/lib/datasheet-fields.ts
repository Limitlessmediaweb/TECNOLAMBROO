/**
 * Campi del datasheet del configuratore, nello stesso ordine e con le stesse etichette italiano/inglese
 * del datasheet ufficiale Tecnolambro (TFTG-120, ED. 01/23 REV 01).
 *
 * Regola: ogni campo è sempre presente. Il valore arriva solo dai dati di catalogo della ditta
 * (data/catalogo-ditta.ts, data/waveguides.ts) o dalla configurazione scelta; se per quel pezzo il dato
 * non c'è, il campo resta con «Su richiesta / On request». Mai un valore stimato.
 */
import { TFTG, TFTG_LENGTHS, TFTG_PRESSURE, TFTG_WEIGHT_G } from "@/data/catalogo-ditta";
import { SIZE_BY_WR } from "@/data/waveguides";
import { isFlexible, type Finish, type PartSpec, type PartType } from "@/data/configurator/types";
import { electricalFor } from "./datasheet";

export const ON_REQUEST = "Su richiesta / On request";

export type SheetField = {
  /** etichetta italiana e inglese (come nell'originale: "Flangia 1 / Flange 1") */
  it: string;
  en: string;
  /** valore; null = su richiesta */
  value: string | null;
  group: "id" | "rf" | "mech";
};

/** Nomi del prodotto in italiano e in inglese (stessi del configuratore). */
const PRODUCT: Record<PartType, [string, string]> = {
  twistable: ["Guida flessibile twistabile", "Twistable flexible waveguide"],
  seamless: ["Guida flessibile seamless", "Seamless flexible waveguide"],
  bend: ["Curva", "Bend"],
  twist: ["Twist", "Twist"],
  offset: ["Disassato", "Offset"],
  custom: ["Su disegno", "To your drawing"],
  straight: ["Tratto rigido", "Rigid straight section"],
  transition: ["Transizione", "Transition"],
  termination: ["Terminazione", "Termination"],
  pressure: ["Pressurizzatore", "Pressure section"],
  spacer: ["Spessore", "Spacer"],
};
const FINISH: Record<Finish, [string, string]> = {
  bright: ["Brillantatura", "Bright dip"],
  silver: ["Argentatura", "Silver plating"],
  painted: ["Verniciatura", "Painting"],
  surtec: ["Surtec 650", "Surtec 650"],
  raw: ["Grezzo", "Untreated"],
  tin: ["Stagnatura", "Tin plating"],
};
const bi = ([a, b]: [string, string]) => (a === b ? a : `${a} / ${b}`);

export type FieldInput = {
  spec: PartSpec;
  /** codice articolo (formato compatto) */
  code: string;
  /** nomi delle flange come nel configuratore, es. "IEC-UBR 100"; f2 null = nessuna flangia 2 */
  f1: string;
  f2: string | null;
  /** formattazione dei numeri (punto decimale come nell'originale) */
  fmt?: (v: number, decimals?: number) => string;
  /** edizione e revisione del documento, es. "ED. 11/26 REV 00" */
  edition: string;
};

const dot = (v: number, d = 0) => (d ? v.toFixed(d).replace(/0+$/, "").replace(/\.$/, "") : String(Math.round(v)));

export function sheetFields({ spec, code, f1, f2, fmt = dot, edition }: FieldInput): SheetField[] {
  const size = SIZE_BY_WR.get(spec.wr);
  const size2 = spec.wr2 ? SIZE_BY_WR.get(spec.wr2) : undefined;
  const tftg = spec.type === "twistable" ? TFTG[spec.wr] : undefined;
  const el = electricalFor(spec, fmt);
  const ev = (key: string) => el?.values.find((v) => v.key === key)?.value ?? null;
  const material: [string, string] = spec.material === "al" ? ["Alluminio", "Aluminium"] : ["Ottone", "Brass"];
  const flex = isFlexible(spec.type);

  const wg = (s: NonNullable<typeof size>) => `${s.iec} ${s.wr.replace("-", "")} ${s.wg}`;
  const guide = size ? (size2 ? `${wg(size)} → ${wg(size2)}` : wg(size)) : null;

  // lunghezza: la tolleranza è dichiarata solo nei datasheet TFTG (± 2 %)
  const L = spec.type === "bend" ? null : spec.length;
  const length = L ? `${fmt(L)} mm ${tftg ? "± 2 %" : "– toll. su richiesta / tol. on request"}` : spec.type === "bend" ? `${fmt(spec.leg1 ?? 0)} × ${fmt(spec.leg2 ?? 0)} mm – toll. su richiesta / tol. on request` : null;

  // rivestimento: guaina in gomma siliconica MIL-S-23586 sulle twistabili a catalogo
  const jacketOn = flex && spec.jacket === 1;
  const external = jacketOn
    ? tftg
      ? "Gomma siliconica MIL-S-23586 / Silicone rubber MIL-S-23586"
      : "Guaina in gomma (materiale su richiesta) / Rubber jacket (material on request)"
    : `${bi(material)} · ${bi(FINISH[spec.finish])}`;
  const jacketDims = jacketOn ? (tftg ? `${tftg.jacket.replace(" × ", "x")} mm` : null) : "— (senza rivestimento / no jacket)";

  const weight = spec.type === "twistable" ? TFTG_WEIGHT_G[code] : undefined;
  const catalogLength = tftg && TFTG_LENGTHS.includes(spec.length as (typeof TFTG_LENGTHS)[number]);

  return [
    { group: "id", it: "Prodotto", en: "Product type", value: bi(PRODUCT[spec.type]) },
    { group: "id", it: "Identificazione guida d’onda", en: "Waveguide", value: guide },
    { group: "id", it: "Flangia 1", en: "Flange 1", value: `${f1} · ${bi(material)}` },
    { group: "id", it: "Flangia 2", en: "Flange 2", value: f2 ? `${f2} · ${bi(material)}` : "— (pezzo con una sola flangia / single flange)" },
    { group: "id", it: "Lunghezza", en: "Length", value: length },
    { group: "id", it: "Finitura flange", en: "Flange finish", value: bi(FINISH[spec.finish]) },
    { group: "id", it: "Finitura esterna / rivestimento", en: "External finish / jacket", value: external },
    { group: "rf", it: "Gamma di frequenza", en: "Frequency range", value: size ? [size, size2].filter(Boolean).map((s) => `${dot(s!.min, 2)} – ${dot(s!.max, 2)} GHz`).join(" → ") : null },
    { group: "rf", it: "Insertion loss", en: "Insertion loss", value: ev("il") ?? ev("ilMax") },
    { group: "rf", it: "Return loss", en: "Return loss", value: ev("rl") ?? (ev("vswr") ? `VSWR ${ev("vswr")}` : null) },
    { group: "rf", it: "Potenza CW", en: "CW power", value: ev("cw") },
    { group: "mech", it: "Raggio min. curvatura piano E (statico)", en: "Min E-plane bend radius (static)", value: ev("rE") },
    { group: "mech", it: "Raggio min. curvatura piano H (statico)", en: "Min H-plane bend radius (static)", value: ev("rH") },
    { group: "mech", it: "Grado massimo twist (statico)", en: "Maximum twist (static)", value: ev("twist") },
    { group: "mech", it: "Viteria", en: "Screws", value: tftg ? "Inox, adatta alla flangia / Stainless steel, to suit the flange" : null },
    { group: "mech", it: "Guarnizione", en: "Gasket", value: tftg ? "Gomma siliconica / Silicone rubber / NBR" : null },
    { group: "mech", it: "Peso", en: "Weight", value: weight ? `${fmt(weight)} g` : null },
    { group: "mech", it: "Dimensioni del rivestimento", en: "Jacket dimensions", value: jacketDims },
    { group: "mech", it: "Pressurizzazione max", en: "Max pressurization", value: tftg ? `${fmt(TFTG_PRESSURE.max)} psi` : ev("pMax") },
    { group: "mech", it: "Pressurizzazione di esercizio", en: "Operating pressure", value: tftg ? `${fmt(TFTG_PRESSURE.operating, 1)} psi` : null },
    { group: "mech", it: "Edizione / revisione", en: "Edition / revision", value: edition },
  ].map((f) => (f.it === "Return loss" && tftg && !catalogLength ? { ...f, value: null } : f)) as SheetField[];
}

/** "ED. 11/26 REV 00": mese e anno di generazione; la revisione parte da 00 per i pezzi configurati. */
export function editionFor(date = new Date()): string {
  return `ED. ${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getFullYear()).slice(-2)} REV 00`;
}
