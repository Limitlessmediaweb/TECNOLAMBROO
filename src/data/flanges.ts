import { SIZE_BY_WR } from "./waveguides";

/**
 * Flange del configuratore, per misura, con le quote principali.
 *
 * Fonte: SPINNER GmbH, Technical Information TD-00077 Issue G (2018-10-09), "Flanges for ordinary
 * rectangular waveguides" (00_MATERIALE/01_FOTO_ARCHIVIO_PAPA/Flang SPINNER_TD00077.pdf). Quote nominali
 * in millimetri, senza tolleranze: servono al modello 3D e alle miniature, non sostituiscono la norma.
 *
 * Controllo del 24/11/2026: tutte le IEC-UBR, IEC-PBR e IEC-CBR del documento sono QUADRATE (A = B) ed
 * esistono solo da R84 (WR-112) a R320 (WR-28). Le rettangolari sono UDR / PDR e le CPR.
 *
 * Lettere del documento:
 *  - quadrate: A = B lato · E, F semi-interassi dei 4 fori (E sul lato stretto della guida, F sul lato largo)
 *  - rettangolari: A lato corto, B lato lungo · fori a (±F, ±H) sui lati corti e a (±E, ±G) sui lati lunghi
 *  - tonde: A diametro esterno, E diametro del cerchio dei fori
 *  - C spessore, "hole" diametro dei fori passanti
 *
 * [DA CONFERMARE con l'ufficio tecnico] quali di queste flange Tecnolambro monta davvero e quali sono
 * le "consigliate" (`rec`): oggi sono le flange tipiche indicate dal titolare per WR-28…WR-90 e, per le
 * altre misure, la piana IEC più comune.
 */
export type FlangeStyle = "plain" | "groove" | "choke";
export type FlangeShape = "square" | "rect" | "round";
export type FlangeFamily = "IEC" | "UG" | "CPR";

export type FlangeDef = {
  id: string;
  /** sigla come sulla norma, es. "IEC-UBR 100", "UG-39/U", "CPR 90 G" */
  label: string;
  family: FlangeFamily;
  style: FlangeStyle;
  shape: FlangeShape;
  /** quadrata: lato · rettangolare: lato corto · tonda: diametro */
  A: number;
  /** rettangolare: lato lungo */
  B?: number;
  E: number;
  F?: number;
  G?: number;
  H?: number;
  /** diametro dei fori (per i fori filettati: il diametro nominale della vite) */
  hole: number;
  /** spessore */
  C: number;
  /** numero di fori */
  holes: number;
  /** consigliata per la misura */
  rec?: boolean;
};

/** Stessa forma di prima per le pagine che elencano solo le sigle. */
export type FlangeOption = FlangeDef;

export const OTHER_FLANGE = "other";

type Sq = [A: number, E: number, F: number, hole: number, C: number];
type Rc = [A: number, B: number, E: number, F: number | null, G: number, H: number, hole: number, C: number];

const sq = (id: string, label: string, family: FlangeFamily, style: FlangeStyle, [A, E, F, hole, C]: Sq, rec = false): FlangeDef => ({ id, label, family, style, shape: "square", A, E, F, hole, C, holes: 4, rec });

/** Fori: 2 per lato corto (1 se F manca) + 2 per lato lungo, più quello centrale quando l'interasse G è grande (CPR 229 e 284). */
const rc = (id: string, label: string, family: FlangeFamily, style: FlangeStyle, [A, B, E, F, G, H, hole, C]: Rc, rec = false): FlangeDef => ({
  id,
  label,
  family,
  style,
  shape: "rect",
  A,
  B,
  E,
  F: F ?? undefined,
  G,
  H,
  hole,
  C,
  holes: (F ? 4 : 2) + 4 + (F && G / F > 1.8 ? 2 : 0),
  rec,
});

const round = (id: string, label: string, [A, E, hole, C]: [number, number, number, number], rec = false): FlangeDef => ({ id, label, family: "UG", style: "plain", shape: "round", A, E, hole, C, holes: 4, rec });

/** Le tre quadrate IEC di una misura: piana, con gola per guarnizione, choke. */
const iecSquare = (n: number, d: Sq, rec = false): FlangeDef[] => [
  sq(`UBR${n}`, `IEC-UBR ${n}`, "IEC", "plain", d, rec),
  sq(`PBR${n}`, `IEC-PBR ${n}`, "IEC", "groove", d),
  sq(`CBR${n}`, `IEC-CBR ${n}`, "IEC", "choke", d),
];
/** Le due rettangolari IEC: piana e con gola. */
const iecRect = (n: number, d: Rc, rec = false): FlangeDef[] => [rc(`UDR${n}`, `IEC-UDR ${n}`, "IEC", "plain", d, rec), rc(`PDR${n}`, `IEC-PDR ${n}`, "IEC", "groove", d)];
/** Le due EIA: CPR F (piana) e CPR G (con gola). Lo spessore non è nel documento: quello della MIL equivalente. */
const cpr = (wr: number, d: Rc, recG = false): FlangeDef[] => [rc(`CPR${wr}F`, `CPR ${wr} F`, "CPR", "plain", d), rc(`CPR${wr}G`, `CPR ${wr} G`, "CPR", "groove", d, recG)];

export const FLANGES: Readonly<Record<string, readonly FlangeDef[]>> = {
  "WR-22": [round("UG-383", "UG-383/U", [28.58, 23.81, 2.85, 6.35], true)],
  "WR-28": [
    sq("UG-599", "UG-599/U", "UG", "plain", [19.05, 6.73, 6.35, 2.95, 4.75], true),
    ...iecSquare(320, [19.1, 6.73, 6.35, 3.0, 2.8]),
    sq("UG-600A", "UG-600A/U", "UG", "choke", [19.05, 6.73, 6.35, 2.85, 2.77]),
    ...iecRect(320, [31.0, 34.0, 9.7, null, 5.1, 12.2, 3.0, 6.5]),
    round("UG-381", "UG-381/U", [28.58, 23.81, 2.85, 6.35]),
  ],
  "WR-34": [...iecSquare(260, [22.1, 7.9, 7.5, 3.0, 4.1], true), ...iecRect(260, [32.0, 36.0, 10.0, null, 5.1, 13.0, 3.0, 6.5])],
  "WR-42": [
    sq("UG-595", "UG-595/U", "UG", "plain", [22.22, 8.51, 8.13, 2.95, 4.78], true),
    ...iecSquare(220, [22.4, 8.51, 8.13, 3.0, 4.1]),
    sq("UG-596A", "UG-596A/U", "UG", "choke", [22.23, 8.51, 8.13, 2.85, 3.96]),
    ...iecRect(220, [32.0, 38.0, 10.0, null, 5.1, 14.0, 3.0, 6.5]),
  ],
  "WR-51": [...iecSquare(180, [30.1, 11.25, 10.29, 4.0, 4.1], true), ...iecRect(180, [35.5, 42.0, 12.7, null, 5.97, 15.87, 4.0, 7.5])],
  "WR-62": [
    sq("UG-419", "UG-419/U", "UG", "plain", [33.35, 12.14, 12.62, 3.66, 3.18], true),
    ...iecSquare(140, [33.3, 12.14, 12.62, 4.0, 4.8]),
    sq("UG-541A", "UG-541A/U", "UG", "choke", [33.32, 12.14, 12.62, 3.5, 4.78]),
    ...iecRect(140, [36.5, 44.5, 12.7, null, 5.97, 16.67, 4.0, 7.5]),
  ],
  // foro delle quadrate R120: nel documento manca per le IEC, è quello della MIL con lo stesso interasse (M3922/53-007)
  "WR-75": [...iecSquare(120, [38.1, 14.25, 13.21, 3.66, 4.1], true), ...iecRect(120, [39.5, 49.0, 14.29, null, 7.94, 19.05, 4.0, 7.5])],
  "WR-90": [
    ...iecSquare(100, [41.4, 16.26, 15.49, 4.17, 4.1], true),
    ...cpr(90, [40.48, 53.18, 14.68, 7.94, 7.94, 21.03, 4.29, 6.35], true),
    sq("UG-39", "UG-39/U", "UG", "plain", [41.28, 16.26, 15.49, 4.29, 4.06]),
    sq("UG-40B", "UG-40B/U", "UG", "choke", [41.28, 16.26, 15.49, 4.17, 4.06]),
    ...iecRect(100, [40.5, 53.2, 14.68, 7.94, 7.94, 21.03, 4.0, 7.5]),
  ],
  "WR-112": [
    ...iecSquare(84, [47.8, 18.72, 17.17, 4.17, 6.4], true),
    sq("UG-51", "UG-51/U", "UG", "plain", [47.63, 18.72, 17.17, 4.29, 6.35]),
    sq("UG-52B", "UG-52B/U", "UG", "choke", [47.63, 18.72, 17.17, 4.17, 6.35]),
    ...iecRect(84, [44.5, 63.5, 16.27, 7.94, 9.52, 24.21, 4.0, 7.5]),
    ...cpr(112, [44.5, 63.5, 16.26, 7.95, 9.53, 24.2, 4.29, 6.35]),
  ],
  "WR-137": [...iecRect(70, [49.2, 68.3, 18.26, 7.94, 11.11, 27.79, 5.0, 10.0], true), ...cpr(137, [49.21, 68.26, 18.26, 7.94, 11.11, 27.79, 5.03, 6.35])],
  "WR-159": [...iecRect(58, [61.9, 81.0, 22.23, 9.52, 12.7, 32.33, 6.35, 10.0], true), ...cpr(159, [61.91, 80.95, 22.23, 9.52, 12.7, 32.33, 6.53, 9.65])],
  "WR-187": [...iecRect(48, [63.5, 88.9, 23.22, 11.12, 14.3, 35.92, 6.35, 10.0], true), ...cpr(187, [63.5, 88.9, 23.22, 11.11, 14.29, 35.92, 6.55, 9.65])],
  "WR-229": [...iecRect(40, [69.9, 98.4, 26.67, 12.7, 27.18, 41.15, 6.35, 10.0], true), ...cpr(229, [69.85, 98.43, 26.67, 12.7, 27.18, 41.15, 6.53, 9.65])],
  "WR-284": [...iecRect(32, [76.2, 114.3, 29.57, 14.68, 32.54, 48.61, 6.35, 10.0], true), ...cpr(284, [76.2, 114.3, 29.57, 14.68, 32.53, 48.62, 6.55, 9.65])],
};

const BY_ID: ReadonlyMap<string, FlangeDef> = new Map(Object.values(FLANGES).flatMap((list) => list.map((f) => [f.id, f] as const)));

/** Flange disponibili per la misura, le consigliate per prime. */
export function flangesFor(wr: string): FlangeDef[] {
  if (!SIZE_BY_WR.has(wr)) return [];
  const list = FLANGES[wr] ?? [];
  return [...list.filter((f) => f.rec), ...list.filter((f) => !f.rec)];
}

export function flangeById(id: string): FlangeDef | undefined {
  return BY_ID.get(id);
}

/** Sigla da mostrare: "IEC-UBR 100" per "UBR100"; un id sconosciuto (vecchi link) resta com'è. */
export function flangeLabel(id: string): string {
  return BY_ID.get(id)?.label ?? id;
}

/** La flangia si può montare su questa misura? ("Altra" sempre) */
export function flangeFits(id: string, wr: string): boolean {
  return id === OTHER_FLANGE || (FLANGES[wr] ?? []).some((f) => f.id === id);
}

/**
 * Posizione dei fori nel piano della flangia: u = lato largo della guida (a), v = lato stretto (b).
 * Usata dal modello 3D e dalle miniature 2D.
 */
export function flangeHoles(f: FlangeDef): [u: number, v: number][] {
  if (f.shape === "round") {
    const r = f.E / 2;
    return [45, 135, 225, 315].map((deg) => [Math.cos((deg * Math.PI) / 180) * r, Math.sin((deg * Math.PI) / 180) * r] as [number, number]);
  }
  if (f.shape === "square") {
    const F = f.F ?? f.E;
    return [[F, f.E], [-F, f.E], [-F, -f.E], [F, -f.E]];
  }
  const out: [number, number][] = [];
  const H = f.H ?? 0;
  const G = f.G ?? 0;
  for (const s of [1, -1]) {
    if (f.F) out.push([s * H, f.F], [s * H, -f.F]);
    else out.push([s * H, 0]);
    out.push([G, s * f.E], [-G, s * f.E]);
    if (f.holes === 10) out.push([0, s * f.E]);
  }
  return out;
}

export type FlangeGroove = { shape: "circle" | "rect"; /** cerchio: raggio medio · rettangolo: distanza media dal foro della guida */ at: number; width: number; gasket: boolean };

/**
 * Gole sulla faccia di accoppiamento, dalla più interna alla più esterna: gola per l'o-ring (PBR, PDR,
 * CPR G) e, per le choke (CBR, UG-…B), la gola choke più vicina al foro della guida. Il documento
 * Spinner non ne riporta le quote: stanno tra il foro rettangolare a × b e i fori delle viti, in proporzione.
 */
export function flangeGrooves(f: FlangeDef, a: number, b: number): FlangeGroove[] {
  if (f.style === "plain") return [];
  if (f.shape === "rect") {
    const gap = Math.min(f.E - f.hole / 2 - b / 2, (f.H ?? 0) - f.hole / 2 - a / 2);
    return gap < 1.5 ? [] : [{ shape: "rect", at: gap * 0.51, width: gap * 0.3, gasket: true }];
  }
  const hd = Math.hypot(a, b) / 2;
  const rb = Math.min(...flangeHoles(f).map(([u, v]) => Math.hypot(u, v))) - f.hole / 2;
  const span = rb - hd;
  if (span < 1.5) return [];
  return f.style === "choke"
    ? [
        { shape: "circle", at: hd + span * 0.2, width: span * 0.17, gasket: false },
        { shape: "circle", at: hd + span * 0.68, width: span * 0.24, gasket: true },
      ]
    : [{ shape: "circle", at: hd + span * 0.58, width: span * 0.26, gasket: true }];
}

/** Ingombro nel piano (u, v): larghezza lungo il lato largo della guida, altezza lungo quello stretto. */
export function flangeOutline(f: FlangeDef): { w: number; h: number } {
  return f.shape === "rect" ? { w: f.B ?? f.A, h: f.A } : { w: f.A, h: f.A };
}

/**
 * [DA CONFERMARE] Opzioni aggiuntive del pezzo. Restano nascoste (visible: false) finché
 * l'ufficio tecnico non le conferma; i testi sono in messages → configurator.options.<id>.
 */
export type ExtraOption = { id: string; visible: boolean };

export const EXTRA_OPTIONS: readonly ExtraOption[] = [
  { id: "jacket", visible: false },
  { id: "pressurized", visible: false },
] as const;

export const VISIBLE_OPTIONS = EXTRA_OPTIONS.filter((o) => o.visible);
