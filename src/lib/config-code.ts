import { SIZE_BY_WR, iecNumber } from "@/data/waveguides";
import { OTHER_FLANGE, flangeById } from "@/data/flanges";
import { isFlexible, type Finish, type PartSpec } from "@/data/configurator/types";

/**
 * Codice di configurazione nello stile dei codici Tecnolambro: famiglia, numero IEC della guida,
 * geometria, flangia 1, flangia 2, finitura. Esempio: TFTG-100-600-UBR-PBR-ARG.
 *
 * Famiglie dai datasheet di catalogo: TFTG (flessibile twistabile), TCE / TCH (curva piano E / H),
 * TGF (flessibile seamless), TWR (twist rigido). [DA CONFERMARE con l'ufficio tecnico]: TDS per il
 * disassato (codice non trovato nei datasheet) e le sigle delle finiture diverse da ARG.
 *
 * 26/11/2026: tratto rigido TGR, transizione TTG, terminazione TR, pressurizzatore TGP, spessore TSP
 * (famiglie dei datasheet di catalogo). Nei datasheet della ditta il codice è compatto
 * (TGR-100/100-FG, lettere D E F G per le flange): qui resta il formato del configuratore, con le
 * sigle delle flange per esteso. AL = corpo in alluminio, STG = stagnatura [sigle provvisorie].
 */
const FAMILY: Record<string, string> = { twistable: "TFTG", seamless: "TGF", twist: "TWR", offset: "TDS", straight: "TGR", termination: "TR", pressure: "TGP", spacer: "TSP", transition: "TTG" };
const FINISH_CODE: Record<Finish, string> = { bright: "BRL", silver: "ARG", painted: "VRN", surtec: "S650", raw: "GRZ", tin: "STG" };
/** Sigle di finitura riconosciute in coda al codice (per toglierle dal cartiglio). */
export const FINISH_SUFFIX = /-(AL-)?(BRL|ARG|VRN|S650|GRZ|STG)(-G)?$/;

const n = (v: number | null | undefined) => String(Math.round((v ?? 0) * 10) / 10);

/** Sigla corta della flangia nel codice: UBR, PBR, CPRG, UG599… ("XX" per una flangia fuori elenco). */
export function flangeToken(id: string): string {
  if (id === OTHER_FLANGE) return "XX";
  const f = flangeById(id);
  if (!f) return id.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (f.family === "IEC") return f.id.replace(/\d+$/, "");
  if (f.family === "CPR") return `CPR${f.id.slice(-1)}`;
  return f.id.replace("-", "");
}

export function configCode(spec: PartSpec): string {
  const size = SIZE_BY_WR.get(spec.wr);
  const iec = size ? iecNumber(size) : spec.wr.replace("WR-", "WR");
  const flanges = [flangeToken(spec.f1), flangeToken(spec.f2)];
  let family: string;
  let geometry: string;
  if (spec.type === "bend") {
    family = spec.plane === "H" ? "TCH" : "TCE";
    const legs = spec.leg1 === spec.leg2 ? n(spec.leg1) : `${n(spec.leg1)}X${n(spec.leg2)}`;
    geometry = (spec.angle ?? 90) === 90 ? legs : `${legs}-A${n(spec.angle)}`;
  } else if (spec.type === "twist") {
    family = FAMILY.twist;
    geometry = `${n(spec.length)}${(spec.rotation ?? 90) === 90 ? "" : `-R${n(spec.rotation)}`}${spec.direction === "ccw" ? "-CCW" : ""}`;
  } else if (spec.type === "offset") {
    family = `${FAMILY.offset}${spec.plane === "H" ? "H" : "E"}`;
    geometry = `${n(spec.length)}X${n(spec.offset)}`;
  } else if (spec.type === "transition") {
    const s2 = spec.wr2 ? SIZE_BY_WR.get(spec.wr2) : undefined;
    family = FAMILY.transition;
    // come nei datasheet TTG: prima la misura con il numero IEC più basso, flange nello stesso ordine
    const n2 = s2 ? iecNumber(s2) : "XX";
    const swap = Number(n2) < Number(iec);
    const sizes = swap ? [n2, iec] : [iec, n2];
    const tail = [spec.material === "al" ? "AL" : "", FINISH_CODE[spec.finish] ?? ""].filter(Boolean);
    return [family, ...sizes, n(spec.length), ...(swap ? [...flanges].reverse() : flanges), ...tail].join("-");
  } else if (spec.type === "termination") {
    const tail = [spec.material === "al" ? "AL" : "", FINISH_CODE[spec.finish] ?? ""].filter(Boolean);
    return [FAMILY.termination, iec, n(spec.length), flanges[0], ...tail].join("-");
  } else {
    family = FAMILY[spec.type] ?? "TL";
    geometry = n(spec.length);
  }
  const tail = [spec.material === "al" ? "AL" : "", FINISH_CODE[spec.finish] ?? "", isFlexible(spec.type) && spec.jacket ? "G" : ""].filter(Boolean);
  return [family, iec, geometry, ...flanges, ...tail].join("-");
}
