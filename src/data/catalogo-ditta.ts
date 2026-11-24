/**
 * Dati di catalogo Tecnolambro presi dai datasheet generici della ditta (materiale del 24/11/2026).
 * Solo documenti nostri e non legati a un cliente; le misure standard sono state verificate sui
 * documenti di norma. Da quale file arriva ogni dato: src/data/FONTI.md (interno, non pubblicato).
 *
 * Regola: un dato elettrico compare sul sito o nel datasheet solo se è qui per quella stessa
 * famiglia e misura. Dove manca, il sito scrive "su richiesta".
 */
import type { Plane } from "@/data/configurator/types";

/** Lettere delle flange nei codici Tecnolambro (es. TFTG-100/600-FF.GF = UBR + PBR). */
export const FLANGE_LETTER = { D: "UDR", E: "PDR", F: "UBR", G: "PBR" } as const;

/* ------------------------------------------------- flessibile twistabile */

export type TftgRow = {
  /** codice di famiglia, es. "TFTG-100" */
  code: string;
  /** perdita di inserzione, dB/m */
  il: number;
  /** return loss in dB alle lunghezze di catalogo */
  rl: Readonly<Record<600 | 900 | 1200, number>>;
  /** potenza CW, W */
  cw: number;
  /** raggio minimo di curvatura statico nei piani E e H, mm */
  rE: number;
  rH: number;
  /** torsione massima statica, gradi al metro */
  twist: number;
  /** ingombro del rivestimento in gomma siliconica, mm */
  jacket: string;
  /** famiglie di flange a catalogo per la misura */
  flanges: readonly ("UBR" | "PBR" | "UDR" | "PDR")[];
};

export const TFTG_LENGTHS = [600, 900, 1200] as const;
/** Pressurizzazione, psi: massima e di esercizio (uguali per tutte le misure a catalogo). */
export const TFTG_PRESSURE = { max: 30, operating: 5.8 } as const;

const IEC4 = ["UBR", "PBR", "UDR", "PDR"] as const;
export const TFTG: Readonly<Record<string, TftgRow>> = {
  "WR-187": { code: "TFTG-48", il: 0.17, rl: { 600: 28.3, 900: 27.3, 1200: 27.3 }, cw: 3000, rE: 160, rH: 310, twist: 110, jacket: "35.5 × 62", flanges: ["UDR", "PDR"] },
  "WR-137": { code: "TFTG-70", il: 0.3, rl: { 600: 28.3, 900: 27.3, 1200: 27.3 }, cw: 2000, rE: 60, rH: 85, twist: 210, jacket: "27 × 46", flanges: ["UDR", "PDR"] },
  "WR-112": { code: "TFTG-84", il: 0.36, rl: { 600: 27.3, 900: 26.4, 1200: 26.4 }, cw: 1500, rE: 77, rH: 120, twist: 260, jacket: "22 × 40", flanges: IEC4 },
  "WR-90": { code: "TFTG-100", il: 0.4, rl: { 600: 27.3, 900: 26.4, 1200: 26.4 }, cw: 1000, rE: 44, rH: 63, twist: 230, jacket: "18.5 × 32", flanges: IEC4 },
  "WR-75": { code: "TFTG-120", il: 0.5, rl: { 600: 25.7, 900: 24.9, 1200: 24.9 }, cw: 750, rE: 35, rH: 63, twist: 230, jacket: "18.5 × 27.5", flanges: IEC4 },
  "WR-62": { code: "TFTG-140", il: 0.8, rl: { 600: 25.7, 900: 24.9, 1200: 24.9 }, cw: 400, rE: 25, rH: 47, twist: 250, jacket: "16 × 24", flanges: IEC4 },
  "WR-51": { code: "TFTG-180", il: 1, rl: { 600: 24.9, 900: 23.1, 1200: 23.1 }, cw: 250, rE: 25, rH: 47, twist: 250, jacket: "14 × 22", flanges: IEC4 },
  "WR-42": { code: "TFTG-220", il: 1.2, rl: { 600: 20.8, 900: 20.8, 1200: 20.8 }, cw: 100, rE: 35, rH: 64, twist: 360, jacket: "Ø 17.5", flanges: ["UBR", "PBR"] },
  "WR-34": { code: "TFTG-260", il: 1.5, rl: { 600: 20.8, 900: 20.1, 1200: 19.4 }, cw: 100, rE: 35, rH: 64, twist: 360, jacket: "Ø 16", flanges: ["UBR", "PBR"] },
  "WR-28": { code: "TFTG-320", il: 2, rl: { 600: 19.7, 900: 18.8, 1200: 18.8 }, cw: 75, rE: 22, rH: 40, twist: 360, jacket: "Ø 13.5", flanges: ["UBR", "PBR"] },
};

/* --------------------------------------------------- flessibile seamless */

/** Guida flessibile seamless nuda (codici TLFX): dati elettrici e raggi minimi dove esiste il datasheet. */
export const TLFX_SHEET: Readonly<Record<string, { code: string; il: number; vswr: number; rE: number; rH: number }>> = {
  "WR-90": { code: "TLFX-100", il: 0.3, vswr: 1.07, rE: 20, rH: 38 },
};

/* ------------------------------------------------------------------ curve */

/**
 * Curve a 90° in guida rigida (TCE piano E, TCH piano H). `h` = lunghezza delle gambe a catalogo in mm
 * (anche diverse tra loro, es. 50 × 100). Perdita di inserzione e VSWR massimi dal datasheet.
 */
export type BendRow = { wr: string; plane: Plane; h: readonly number[]; il?: number; vswr: number };
export const BENDS: readonly BendRow[] = [
  { wr: "WR-90", plane: "E", h: [50, 100], il: 0.2, vswr: 1.1 },
  { wr: "WR-90", plane: "H", h: [50, 100], il: 0.2, vswr: 1.1 },
  { wr: "WR-75", plane: "E", h: [50], il: 0.2, vswr: 1.1 },
  { wr: "WR-42", plane: "H", h: [50], il: 0.2, vswr: 1.1 },
  { wr: "WR-34", plane: "H", h: [50], il: 0.2, vswr: 1.1 },
  { wr: "WR-28", plane: "E", h: [60], il: 0.25, vswr: 1.15 },
  { wr: "WR-28", plane: "H", h: [40], il: 0.2, vswr: 1.2 },
  { wr: "WR-137", plane: "E", h: [50], vswr: 1.09 },
];

export function bendRow(wr: string, plane: Plane | undefined): BendRow | undefined {
  return BENDS.find((b) => b.wr === wr && b.plane === (plane ?? "E"));
}

/* -------------------------------------------------------------- coperture */

/**
 * Coperture di protezione delle flange in LDPE blu (codici TCF). Quote in mm: lati esterni (w lungo il
 * lato largo della guida), altezza, spessore di parete, raggio degli spigoli. `fits` = famiglie di
 * flange su cui si monta.
 */
export type CoverRow = { code: string; wr: string; fits: readonly string[]; w: number; h: number; height: number; wall: number; r: number };
export const COVERS: readonly CoverRow[] = [
  { code: "TCF-320", wr: "WR-28", fits: ["UBR", "PBR"], w: 21.5, h: 21.5, height: 6.5, wall: 1.1, r: 2 },
  { code: "TCF-140", wr: "WR-62", fits: ["UBR", "PBR"], w: 36, h: 36, height: 8.5, wall: 1.2, r: 2.5 },
  { code: "TCF-100", wr: "WR-90", fits: ["UBR", "PBR"], w: 44.5, h: 44.5, height: 8, wall: 1.5, r: 4 },
  { code: "TCF-48", wr: "WR-187", fits: ["UDR", "PDR"], w: 93.5, h: 68, height: 14, wall: 1.5, r: 4 },
];

/* ------------------------------------------------------------ guarnizioni */

/**
 * Guarnizioni in silicone 60 ShA (codici TLG). Quote in mm: ingombro del profilo chiuso (w lungo il lato
 * largo della guida) e sezione. `flange` = flangia su cui si monta.
 */
export type GasketRow = { code: string; wr: string; flange: string; w: number; h: number; section: number; profile: "round" | "rect" | "half" };
export const GASKETS: readonly GasketRow[] = [
  { code: "TLG-100/00S", wr: "WR-90", flange: "PDR100", w: 32.2, h: 19.6, section: 3.56, profile: "rect" },
  { code: "TLG-CPR90G-FULL", wr: "WR-90", flange: "CPR90G", w: 34.75, h: 22.05, section: 2.62, profile: "round" },
  { code: "TLG-CPR284G-FULL", wr: "WR-284", flange: "CPR284G", w: 88.6, h: 50.6, section: 3.53, profile: "round" },
  { code: "TLG-CPR284G-HALF", wr: "WR-284", flange: "CPR284G", w: 88.6, h: 50.6, section: 1.76, profile: "half" },
];

/* ---------------------------------------------------------------- cast bend */

/**
 * Curve fuse compatte ("cast bend", a gradini). A oggi non ci sono quote nostre pubblicabili: la
 * famiglia è "su richiesta". Misure viste nel materiale: WR-284 piano E (alluminio) e WR-229 (solo
 * file CorelDRAW, da confermare).
 */
export const CAST_BEND_SIZES: readonly { wr: string; planes: readonly Plane[] }[] = [
  { wr: "WR-284", planes: ["E"] },
  { wr: "WR-229", planes: ["E", "H"] },
];
