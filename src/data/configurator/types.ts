/**
 * Tipi di pezzo del configuratore e loro opzioni. Per aggiungere un tipo: una voce in PART_TYPES,
 * i valori predefiniti in defaults.ts, i testi in messages → configurator.types.<tipo>, e (se ha una
 * geometria) un percorso in lib/part3d.ts e lib/drawing.ts.
 */
import type { FamilyKey } from "@/data/families";

/**
 * Tipi del configuratore. Gli ultimi cinque (tratto rigido TGR, transizione TTG, terminazione TR,
 * pressurizzatore TGP, spessore TSP) ci sono solo nel configuratore premium (`premiumOnly`).
 */
export type PartType = "twistable" | "seamless" | "bend" | "twist" | "offset" | "custom" | "straight" | "transition" | "termination" | "pressure" | "spacer";
export type Plane = "E" | "H";
/** grezzo · brillantatura · argentatura · verniciatura · Surtec 650 · stagnatura */
export type Finish = "raw" | "bright" | "silver" | "painted" | "surtec" | "tin";
/** materiale del corpo: ottone/rame (cu) o alluminio (al) */
export type Material = "cu" | "al";
export type Treatment = "none" | "galvanic" | "thermal";
export type TwistDirection = "cw" | "ccw";

export type PartSpec = {
  type: PartType;
  /** "WR-90", oppure "unknown" per i pezzi su disegno senza misura */
  wr: string;
  /** flange (id da data/flanges.ts o "other") */
  f1: string;
  f2: string;
  finish: Finish;
  treatment: Treatment;
  /** lunghezza totale in mm: flessibili, twist, disassati */
  length?: number;
  /** curva e disassato */
  plane?: Plane;
  /** curva: angolo in gradi (1-180) */
  angle?: number;
  /** curva: raggio di curvatura in mm; null = standard */
  radius?: number | null;
  /** curva: lunghezza delle gambe in mm */
  leg1?: number;
  leg2?: number;
  /** twist: rotazione in gradi e senso */
  rotation?: number;
  direction?: TwistDirection;
  /** disassato: spostamento laterale in mm */
  offset?: number;
  /** flessibili: guaina in gomma (configuratore premium) */
  jacket?: 0 | 1;
  /** transizione: misura del lato 2 (la flangia 2 è di questa misura) */
  wr2?: string;
  /** materiale del corpo (premium); assente = ottone/rame */
  material?: Material;
};

export type PartTypeDef = {
  type: PartType;
  /** famiglia del sito (pagina prodotto) */
  family: FamilyKey | null;
  /** passi del configuratore oltre a tipo, misura, flange e finitura */
  geometry: "length" | "bend" | "twist" | "offset" | "custom";
  /** ha un modello 3D generato */
  has3d: boolean;
  /** solo nel configuratore premium (il configuratore classico non lo elenca) */
  premiumOnly?: boolean;
};

export const PART_TYPES: readonly PartTypeDef[] = [
  { type: "twistable", family: "twistable", geometry: "length", has3d: true },
  { type: "seamless", family: "seamless", geometry: "length", has3d: true },
  { type: "bend", family: "bends", geometry: "bend", has3d: true },
  { type: "twist", family: "twists", geometry: "twist", has3d: true },
  { type: "offset", family: "offsets", geometry: "offset", has3d: true },
  { type: "custom", family: null, geometry: "custom", has3d: false },
  { type: "straight", family: null, geometry: "length", has3d: true, premiumOnly: true },
  { type: "transition", family: null, geometry: "length", has3d: true, premiumOnly: true },
  { type: "termination", family: null, geometry: "length", has3d: true, premiumOnly: true },
  { type: "pressure", family: null, geometry: "length", has3d: true, premiumOnly: true },
  { type: "spacer", family: null, geometry: "length", has3d: true, premiumOnly: true },
] as const;

/** Tipi del configuratore classico (senza quelli solo premium). */
export const CLASSIC_PART_TYPES: readonly PartTypeDef[] = PART_TYPES.filter((d) => !d.premiumOnly);

export const TYPE_DEF: Record<PartType, PartTypeDef> = Object.fromEntries(PART_TYPES.map((d) => [d.type, d])) as Record<PartType, PartTypeDef>;

/** Finiture del configuratore classico. */
export const FINISHES: readonly Finish[] = ["bright", "silver", "painted", "surtec", "raw"];
/**
 * Finiture Tecnolambro per materiale (configuratore premium): ottone/rame → brillantatura,
 * verniciatura, stagnatura, argentatura su richiesta; alluminio → Surtec 650 o argentatura; più grezzo.
 */
export const FINISHES_BY_MATERIAL: Readonly<Record<Material, readonly Finish[]>> = {
  cu: ["bright", "painted", "tin", "silver", "raw"],
  al: ["surtec", "silver", "raw"],
};
export const ALL_FINISHES: readonly Finish[] = ["bright", "silver", "painted", "surtec", "tin", "raw"];
/** Finiture che per quel materiale si fanno su richiesta. */
export const FINISH_ON_REQUEST: Readonly<Record<Material, readonly Finish[]>> = { cu: ["silver"], al: [] };
export const TREATMENTS: readonly Treatment[] = ["none", "galvanic", "thermal"];
export const BEND_ANGLES = [30, 45, 60, 90] as const;
export const TWIST_ROTATIONS = [45, 90] as const;

/** Pezzi con una sola flangia (la terminazione è chiusa sul lato 2). */
export function hasFlange2(t: PartType): boolean {
  return t !== "termination";
}

export function isFlexible(t: PartType): boolean {
  return t === "twistable" || t === "seamless";
}
