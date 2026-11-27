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

/* ======================================================================
 * Famiglie in guida rigida aggiunte il 26/11/2026 (datasheet di catalogo nella cartella
 * "DATASHEET CURVE Disass TRANS GUIDA CAVO ECC ECC"). Ogni riga = un datasheet nostro.
 * I dati elettrici valgono SOLO per la configurazione del datasheet (stessa misura e stessa
 * lunghezza): per le altre il sito scrive "su richiesta".
 * Codici ufficiali della ditta: FAMIGLIA-<n. IEC>/<L>-<lettere flange> (D UDR, E PDR, F UBR, G PBR;
 * H e I = CPR, da confermare quale delle due).
 * ==================================================================== */

/** Riga di un datasheet di catalogo in guida rigida. `flanges` = sigle viste nel datasheet. */
export type RigidSheet = { code: string; wr: string; L: number; flanges: readonly string[]; vswr?: number; il?: string; pMax?: number; material?: "cu" | "al" };

/** Tratti di guida rigida (TGR). */
export const TGR: readonly RigidSheet[] = [
  { code: "TGR-400/3000-FG", wr: "WR-22", L: 3000, flanges: ["PBR", "UBR"], vswr: 1.09, il: "0.2 dB/m" },
  { code: "TGR-260/3000-FG", wr: "WR-34", L: 3000, flanges: ["PBR", "UBR"], vswr: 1.09, il: "0.15 dB/m" },
  { code: "TGR-220/100-GG", wr: "WR-42", L: 100, flanges: ["PBR"], vswr: 1.06, il: "0.2 dB" },
  { code: "TGR-180/3000-FG", wr: "WR-51", L: 3000, flanges: ["PBR", "UBR"], vswr: 1.08, il: "0.15 dB/m" },
  { code: "TGR-120/50-EF", wr: "WR-75", L: 50, flanges: ["PDR", "UBR"], vswr: 1.06 },
  { code: "TGR-120/50-DG", wr: "WR-75", L: 50, flanges: ["UDR", "PBR"], vswr: 1.05 },
  { code: "TGR-100/100-FG", wr: "WR-90", L: 100, flanges: ["PBR", "UBR"], vswr: 1.03 },
  { code: "TGR-100/80-EG", wr: "WR-90", L: 80, flanges: ["PBR", "PDR"], vswr: 1.03 },
  { code: "TGR-40/150-HI", wr: "WR-229", L: 150, flanges: ["CPRF", "CPRG"], vswr: 1.06 },
];
/** Lunghezze viste nei datasheet TGR (mm); le altre si scelgono libere. */
export const TGR_LENGTHS = [50, 100, 150, 300, 500, 1000, 2000, 3000] as const;

/** Tronchetti pressurizzatori (TGP): ingresso aria, pressione massima 30 psi. */
export const TGP: readonly RigidSheet[] = [
  { code: "TGP-400/100-FG", wr: "WR-22", L: 100, flanges: ["PBR", "UBR"], vswr: 1.06, il: "0.15 dB", pMax: 30 },
  { code: "TGP-260/100-FG", wr: "WR-34", L: 100, flanges: ["PBR", "UBR"], vswr: 1.06, il: "0.15 dB", pMax: 30 },
  { code: "TGP-180/100-FG", wr: "WR-51", L: 100, flanges: ["PBR", "UBR"], vswr: 1.06, il: "0.15 dB", pMax: 30 },
];

/** Terminazioni (TR): una sola flangia, l'altra estremità chiusa. */
export const TR: readonly RigidSheet[] = [
  { code: "TR-220/74-F", wr: "WR-42", L: 74, flanges: ["UBR"], vswr: 1.08 },
  { code: "TR-140/60-G", wr: "WR-62", L: 60, flanges: ["PBR"], vswr: 1.13, material: "al" },
  { code: "TR-84/70-G", wr: "WR-112", L: 70, flanges: ["PBR"], vswr: 1.12, material: "al" },
];

/** Spessori (TSP): due flange della stessa misura, L = spessore. */
export const TSP: readonly RigidSheet[] = [
  { code: "TSP-220-GG", wr: "WR-42", L: 4, flanges: ["PBR"], vswr: 1.06 },
  { code: "TSP-100-EF-EF", wr: "WR-90", L: 12, flanges: ["PDR"], vswr: 1.06 },
  { code: "TLSPBR84", wr: "WR-112", L: 6, flanges: ["PBR"] },
  { code: "TSP-48-EE", wr: "WR-187", L: 10, flanges: ["PDR"] },
];

/**
 * Transizioni di guida (TTG) tra due misure vicine. `wr` = misura più piccola (numero IEC più basso
 * nel codice), `wr2` = l'altra. Flange nell'ordine del codice.
 */
export type TransitionSheet = { code: string; wr: string; wr2: string; L: number; flanges: readonly [string, string]; vswr?: number };
export const TTG: readonly TransitionSheet[] = [
  { code: "TTG-70-84/100-DG", wr: "WR-137", wr2: "WR-112", L: 100, flanges: ["UDR", "PBR"], vswr: 1.1 },
  { code: "TTG-84-100/100-EG", wr: "WR-112", wr2: "WR-90", L: 100, flanges: ["PDR", "PBR"], vswr: 1.1 },
  { code: "TTG-84-100/100-FG", wr: "WR-112", wr2: "WR-90", L: 100, flanges: ["UBR", "PBR"], vswr: 1.1 },
  { code: "TTG-84-100/100-F.CBR100", wr: "WR-112", wr2: "WR-90", L: 100, flanges: ["UBR", "CBR"], vswr: 1.1 },
  { code: "TTG-100-120/100-DE", wr: "WR-90", wr2: "WR-75", L: 100, flanges: ["UDR", "PDR"] },
  { code: "TTG-100-120/100-DG", wr: "WR-90", wr2: "WR-75", L: 100, flanges: ["UDR", "PBR"] },
  { code: "TTG-100-120/100-ED", wr: "WR-90", wr2: "WR-75", L: 100, flanges: ["PDR", "UDR"], vswr: 1.06 },
  { code: "TTG-100-120/100-GD", wr: "WR-90", wr2: "WR-75", L: 100, flanges: ["PBR", "UDR"], vswr: 1.06 },
  { code: "TTG-100-120/50-GF", wr: "WR-90", wr2: "WR-75", L: 50, flanges: ["PBR", "UBR"], vswr: 1.06 },
];
/** Coppie di misure con almeno un datasheet TTG (in entrambi i versi). */
export const TTG_PAIRS: readonly (readonly [string, string])[] = [
  ["WR-137", "WR-112"],
  ["WR-112", "WR-90"],
  ["WR-90", "WR-75"],
];

/** Shim in acciaio AISI 301 da 0,2 mm (codici SHIM). */
export type ShimRow = { code: string; wr: string; flange: string };
export const SHIMS: readonly ShimRow[] = [
  { code: "SHIM WR28", wr: "WR-28", flange: "PBR320" },
  { code: "SHIM WR90PBR100", wr: "WR-90", flange: "PBR100" },
  { code: "SHIM WR112", wr: "WR-112", flange: "PDR84" },
  { code: "SHIM WR137", wr: "WR-137", flange: "PDR70" },
];

/** Transizioni guida-cavo (TTGC), connettore N femmina. Prestazioni su richiesta. */
export type CoaxRow = { code: string; wr: string; flange: string; material: "cu" | "al" };
export const COAX: readonly CoaxRow[] = [
  { code: "TTGC-48/D", wr: "WR-187", flange: "UDR48", material: "al" },
  { code: "TTGC-84/D", wr: "WR-112", flange: "UDR84", material: "al" },
  { code: "TTGC-84/G", wr: "WR-112", flange: "PBR84", material: "al" },
  { code: "TTGC-120/EN", wr: "WR-75", flange: "PDR120", material: "cu" },
];

/** Datasheet di catalogo per tipo rigido, misura e (se data) lunghezza. */
export function rigidSheets(type: "straight" | "pressure" | "termination" | "spacer", wr: string): readonly RigidSheet[] {
  const list = type === "straight" ? TGR : type === "pressure" ? TGP : type === "termination" ? TR : TSP;
  return list.filter((r) => r.wr === wr);
}

/**
 * Peso dei TFTG dai datasheet di catalogo (cartella DATASHEET FLEXTWIST PDF), per codice esatto nel
 * formato compatto della ditta. Codice non in tabella = peso «su richiesta». TFTG-48 e TFTG-70: peso non indicato.
 */
export const TFTG_WEIGHT_G: Readonly<Record<string, number>> = {
  "TFTG-84/600-DF.EF": 750,
  "TFTG-84/600-FF.GF": 730,
  "TFTG-84/600-GF.GF": 730,
  "TFTG-84/900-DF.EF": 930,
  "TFTG-84/900-EF.EF": 930,
  "TFTG-84/900-FF.GF": 900,
  "TFTG-84/900-GF.GF": 900,
  "TFTG-84/1200-DF.EF": 1240,
  "TFTG-84/1200-FF.GF": 1200,
  "TFTG-84/1200-GF.GF": 1200,
  "TFTG-100/600-DF.EF": 570,
  "TFTG-100/600-FF.GF": 550,
  "TFTG-100/900-DF.EF": 740,
  "TFTG-100/900-FF.GF": 720,
  "TFTG-100/900-GF.GF": 720,
  "TFTG-100/1200-DF.EF": 860,
  "TFTG-100/1200-FF.GF": 830,
  "TFTG-100/1200-GF.GF": 830,
  "TFTG-120/600-DF.EF": 420,
  "TFTG-120/600-FF.GF": 390,
  "TFTG-120/600-GF.GF": 390,
  "TFTG-120/900-DF.EF": 580,
  "TFTG-120/900-FF.GF": 550,
  "TFTG-120/900-GF.GF": 550,
  "TFTG-120/1200-DF.EF": 725,
  "TFTG-120/1200-FF.GF": 700,
  "TFTG-120/1200-GF.GF": 700,
  "TFTG-140/600-DF.EF": 340,
  "TFTG-140/600-FF.GF": 320,
  "TFTG-140/600-GF.GF": 320,
  "TFTG-140/900-DF.EF": 480,
  "TFTG-140/900-FF.GF": 460,
  "TFTG-140/900-GF.GF": 460,
  "TFTG-140/1200-DF.EF": 660,
  "TFTG-140/1200-FF.GF": 650,
  "TFTG-140/1200-GF.GF": 650,
  "TFTG-180/600-DF.EF": 290,
  "TFTG-180/600-FF.GF": 280,
  "TFTG-180/600-GF.GF": 280,
  "TFTG-180/900-DF.EF": 370,
  "TFTG-180/900-FF.GF": 350,
  "TFTG-180/900-GF.GF": 350,
  "TFTG-180/1200-DF.EF": 510,
  "TFTG-180/1200-FF.GF": 500,
  "TFTG-180/1200-GF.GF": 500,
  "TFTG-220/600-FF.GF": 230,
  "TFTG-220/600-GF.GF": 230,
  "TFTG-220/900-FF.GF": 330,
  "TFTG-220/900-GF.GF": 330,
  "TFTG-220/1200-FF.GF": 410,
  "TFTG-220/1200-GF.GF": 410,
  "TFTG-260/600-FF.GF": 180,
  "TFTG-260/600-GF.GF": 180,
  "TFTG-260/900-FF.GF": 250,
  "TFTG-260/900-GF.GF": 250,
  "TFTG-260/1200-FF.GF": 330,
  "TFTG-260/1200-GF.GF": 330,
  "TFTG-320/600-FF.GF": 150,
  "TFTG-320/600-GF.GF": 150,
  "TFTG-320/900-FF.GF": 210,
  "TFTG-320/900-GF.GF": 210,
  "TFTG-320/1200-FF.GF": 270,
  "TFTG-320/1200-GF.GF": 270,
};
