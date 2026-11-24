/**
 * «Il viaggio del segnale»: percorso della catena di pezzi e tappe dello scroll.
 * Solo numeri (niente three.js): lo usano sia la scena 3D sia l'indicatore a lato.
 * Unità: 1 = 1 mm. Guida WR-90 (R100): foro interno 22,86 × 10,16 mm.
 */

export const A = 22.86;
export const B = 10.16;
export const WALL = 1.27;
/** Spessore della flangia (modello illustrativo) */
export const FL = 5;
/** Lunghezza d'onda in guida del modo TE10 a 10 GHz in WR-90: λg = λ0 / √(1 − (λ0 / 2a)²) ≈ 39,7 mm */
export const LAMBDA_G = 39.7;

const R_BEND = 45;
const ARC = (R_BEND * Math.PI) / 2;
const RIGID1 = 100;
const BEND1 = RIGID1 + 12 + ARC + 12;
const TWIST1 = BEND1 + 90;
const FLEX1 = TWIST1 + 150;

/** Ascisse lungo il percorso: inizio e fine di ogni pezzo e delle zone interne */
export const S = {
  rigid0: 0,
  rigid1: RIGID1,
  arc0: RIGID1 + 12,
  arc1: RIGID1 + 12 + ARC,
  bend1: BEND1,
  tw0: BEND1 + 9,
  tw1: BEND1 + 81,
  twist1: TWIST1,
  cor0: TWIST1 + 13,
  cor1: TWIST1 + 137,
  flex1: FLEX1,
} as const;

/** Lunghezza totale della catena */
export const L = FLEX1;
/** Piega massima della flessibile (radianti, verso opposto alla curva: la catena fa una S) */
export const FLEX_MAX = -1.08;
export const CORR_PITCH = 3.1;
export const CORR_AMP = 1.15;

export type Frame = {
  /** posizione */
  p: [number, number, number];
  /** tangente (direzione di propagazione) */
  t: [number, number, number];
  /** normale alle pareti larghe: direzione del campo elettrico TE10 */
  u: [number, number, number];
  /** direzione del lato largo */
  l: [number, number, number];
};

export function newFrame(): Frame {
  return { p: [0, 0, 0], t: [0, 0, -1], u: [0, 1, 0], l: [-1, 0, 0] };
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const sstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const smoother = (t: number) => {
  t = clamp01(t);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/**
 * Riferimento locale all'ascissa s. `flex` (0..1) è quanto è piegata la flessibile.
 * Il percorso sta nel piano XZ; la rotazione del twist è attorno alla tangente.
 */
export function frameAt(s: number, flex: number, out: Frame): Frame {
  let x = 0;
  let z = 0;
  let psi = 0;
  let from = 0;
  const kFlex = (flex * FLEX_MAX) / (S.cor1 - S.cor0);
  const segs: [number, number][] = [
    [S.arc0, 0],
    [S.arc1, 1 / R_BEND],
    [S.cor0, 0],
    [S.cor1, kFlex],
    [Infinity, 0],
  ];
  for (const [to, k] of segs) {
    const len = Math.min(s, to) - from;
    if (Math.abs(k) < 1e-7) {
      x += Math.sin(psi) * len;
      z -= Math.cos(psi) * len;
    } else {
      const psi1 = psi + k * len;
      x += (Math.cos(psi) - Math.cos(psi1)) / k;
      z -= (Math.sin(psi1) - Math.sin(psi)) / k;
      psi = psi1;
    }
    if (s <= to) break;
    from = to;
  }
  const phi = (Math.PI / 2) * smoother((s - S.tw0) / (S.tw1 - S.tw0));
  const tx = Math.sin(psi);
  const tz = -Math.cos(psi);
  // lato0 = Y × t
  const l0x = tz;
  const l0z = -tx;
  const c = Math.cos(phi);
  const sn = Math.sin(phi);
  const ux = l0x * sn;
  const uy = c;
  const uz = l0z * sn;
  out.p[0] = x;
  out.p[1] = 0;
  out.p[2] = z;
  out.t[0] = tx;
  out.t[1] = 0;
  out.t[2] = tz;
  out.u[0] = ux;
  out.u[1] = uy;
  out.u[2] = uz;
  // l = u × t
  out.l[0] = uy * tz;
  out.l[1] = uz * tx - ux * tz;
  out.l[2] = -uy * tx;
  return out;
}

/* ------------------------------------------------------------- tappe dello scroll (0..1) */

export const P = {
  /** la camera entra nel foro della flangia */
  enter: 0.17,
  rigid: 0.3,
  bend: 0.44,
  twist: 0.63,
  /** la camera esce dall'ultima flangia */
  exit: 0.785,
  /** inquadratura larga sulla catena */
  wide: 0.88,
} as const;

const KEYS: [number, number][] = [
  [P.enter, 0],
  [P.rigid, S.rigid1],
  [P.bend, S.bend1],
  [P.twist, S.twist1],
  [P.exit, L],
];

/** Posizione del segnale (mm lungo la catena) per un avanzamento dello scroll */
export function sOfP(p: number): number {
  if (p <= KEYS[0][0]) return 0;
  for (let i = 1; i < KEYS.length; i++) {
    const [p1, s1] = KEYS[i];
    if (p <= p1) {
      const [p0, s0] = KEYS[i - 1];
      return lerp(s0, s1, (p - p0) / (p1 - p0));
    }
  }
  return L;
}

/** Quanto è piegata la flessibile: si piega mentre il segnale la attraversa */
export function flexOfP(p: number): number {
  return sstep(P.twist - 0.03, P.exit - 0.035, p);
}

/** Confini dei 7 capitoli (per l'indicatore a lato) */
export const CHAPTER_EDGES = [0.085, 0.195, 0.305, 0.445, 0.63, 0.925] as const;

export function chapterOfP(p: number): number {
  let c = 0;
  while (c < CHAPTER_EDGES.length && p >= CHAPTER_EDGES[c]) c++;
  return c;
}

/** Finestre di comparsa degli 8 pannelli di testo [entra, esce] */
export const PANEL_WINDOWS: readonly [number, number][] = [
  [-1, 0.075],
  [0.095, 0.185],
  [0.205, 0.295],
  [0.315, 0.435],
  [0.465, 0.615],
  [0.645, 0.775],
  [0.835, 0.915],
  [0.945, 2],
];

/** Avanzamento rappresentativo di ogni pannello (viste ferme con prefers-reduced-motion) */
export const PANEL_STILLS = [0, 0.14, 0.25, 0.37, 0.545, 0.72, 0.9, 1] as const;
