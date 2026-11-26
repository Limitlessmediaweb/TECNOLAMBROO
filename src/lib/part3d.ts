/**
 * Modello 3D parametrico dei pezzi (Three.js). Si carica SOLO con import dinamico (al clic su
 * "Vedi in 3D" o quando il pannello entra nello schermo): non pesa sul caricamento del sito.
 *
 * Unità: millimetri. Un unico motore "sweep": la sezione (rettangolo della guida) segue la linea
 * mediana del tipo di pezzo — dritto, curva nel piano E o H, twist, disassato a S — con le flange
 * forate alle estremità. Proporzioni: dimensioni interne a × b standard EIA, parete rigida
 * indicativa, quote della tabella TLFX per la flessibile. Il disegno definitivo arriva con il preventivo.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DIM_BY_WR, SIZE_BY_WR, rigidOuter } from "@/data/waveguides";
import { BRASS } from "@/data/brand";
import { flangeById, flangeFits, flangeGrooves, flangeHoles, flangeOutline, flangesFor, type FlangeDef } from "@/data/flanges";
import { visualBendRadius } from "@/data/configurator/defaults";
import { isFlexible, type Finish, type PartSpec } from "@/data/configurator/types";

const V3 = THREE.Vector3;
type Frame = { p: THREE.Vector3; t: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3 };
type Segment = { len: number; at: (d: number) => Frame; step: number };

/** Limite di triangoli per pezzo (telefoni compresi). */
export const TRIANGLE_BUDGET = 60000;
/** Lunghezza massima modellata: oltre si modella questa (quote e codice restano quelli scelti). */
const MAX_MODEL_MM = 3000;

/* ------------------------------------------------------------------ misure */

function sizeOf(spec: PartSpec) {
  const s = SIZE_BY_WR.get(spec.wr) ?? SIZE_BY_WR.get("WR-90")!;
  const rigid = rigidOuter(s);
  const dim = DIM_BY_WR.get(s.wr);
  const A = dim?.A ?? s.a * 1.22;
  const B = dim?.B ?? s.b * 1.36;
  const flex = {
    A,
    B,
    C: dim?.C ?? A * 0.86,
    D: dim?.D ?? B * 0.68,
    P: dim?.P ?? Math.max(1.2, A / 14),
    r: dim?.r ?? Math.max(1, B * 0.2),
    R: dim?.R ?? Math.max(2, B * 0.35),
  };
  const outerW = isFlexible(spec.type) ? flex.A : rigid.w;
  const outerH = isFlexible(spec.type) ? flex.B : rigid.h;
  const flangeT = Math.max(4, Math.min(14, Math.max(outerW, outerH) * 0.28));
  return { s, rigid, flex, outerW, outerH, flangeT };
}

/* --------------------------------------------------------------- percorso */

function straight(f: Frame, len: number, twist = 0, eased = false): Segment {
  return {
    len,
    step: twist ? Math.max(len / 48, 0.5) : len,
    at: (d) => {
      const lin = len ? d / len : 0;
      const e = THREE.MathUtils.clamp((lin - 0.14) / 0.72, 0, 1);
      const k = eased ? e * e * (3 - 2 * e) : lin;
      const p = f.p.clone().addScaledVector(f.t, d);
      if (!twist) return { p, t: f.t.clone(), u: f.u.clone(), v: f.v.clone() };
      const q = new THREE.Quaternion().setFromAxisAngle(f.t, twist * k);
      return { p, t: f.t.clone(), u: f.u.clone().applyQuaternion(q), v: f.v.clone().applyQuaternion(q) };
    },
  };
}

/** Arco che curva verso `dir` (v = piano E, u = piano H) di `angle` radianti con raggio R. */
function arc(f: Frame, R: number, angle: number, dir: "u" | "v"): Segment {
  const toward = dir === "v" ? f.v : f.u;
  const axis = new V3().crossVectors(f.t, toward).normalize();
  const center = f.p.clone().addScaledVector(toward, R);
  const rel = f.p.clone().sub(center);
  return {
    len: R * angle,
    step: R * THREE.MathUtils.degToRad(3),
    at: (d) => {
      const q = new THREE.Quaternion().setFromAxisAngle(axis, d / R);
      return { p: center.clone().add(rel.clone().applyQuaternion(q)), t: f.t.clone().applyQuaternion(q), u: f.u.clone().applyQuaternion(q), v: f.v.clone().applyQuaternion(q) };
    },
  };
}

/** Disassato a S: spostamento laterale X lungo L con profilo smoothstep (tangenti parallele agli estremi). */
function sCurve(L: number, X: number, plane: "E" | "H"): Segment {
  const lateral = plane === "E" ? new V3(0, 1, 0) : new V3(1, 0, 0);
  const h = (s: number) => s * s * (3 - 2 * s);
  const dh = (s: number) => 6 * s * (1 - s);
  // lunghezza dell'arco della curva (numerica)
  const N = 64;
  const cum = [0];
  let prev = new V3(0, 0, 0);
  for (let i = 1; i <= N; i++) {
    const s = i / N;
    const p = new V3().addScaledVector(lateral, X * h(s)).setZ(L * s);
    cum.push(cum[i - 1] + p.distanceTo(prev));
    prev = p;
  }
  const total = cum[N];
  return {
    len: total,
    step: total / 48,
    at: (d) => {
      // dalla lunghezza d'arco al parametro s
      let i = 1;
      while (i < N && cum[i] < d) i++;
      const s = THREE.MathUtils.clamp((i - 1 + (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1])) / N, 0, 1);
      const p = new V3().addScaledVector(lateral, X * h(s)).setZ(L * s);
      const t = new V3().addScaledVector(lateral, X * dh(s)).setZ(L).normalize();
      if (plane === "E") {
        const u = new V3(1, 0, 0);
        return { p, t, u, v: new V3().crossVectors(t, u).normalize() };
      }
      const v = new V3(0, 1, 0);
      return { p, t, u: new V3().crossVectors(v, t).normalize(), v };
    },
  };
}

const START: Frame = { p: new V3(0, 0, 0), t: new V3(0, 0, 1), u: new V3(1, 0, 0), v: new V3(0, 1, 0) };

function pathFor(spec: PartSpec): Segment[] {
  const clampLen = (v: number | undefined, def: number) => Math.min(MAX_MODEL_MM, Math.max(1, v || def));
  switch (spec.type) {
    case "bend": {
      const angle = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(spec.angle ?? 90, 1, 180));
      const R = Math.min(MAX_MODEL_MM, visualBendRadius(spec));
      const dir = spec.plane === "H" ? "u" : "v";
      const leg1 = straight(START, clampLen(spec.leg1, 100));
      const a = arc(leg1.at(leg1.len), R, angle, dir);
      const leg2 = straight(a.at(a.len), clampLen(spec.leg2, 100));
      return [leg1, a, leg2];
    }
    case "twistable":
      // la twistabile si mostra torta di 90° (è il suo mestiere): torsione dolce nel tratto centrale
      return [straight(START, clampLen(spec.length, 600), Math.PI / 2, true)];
    case "twist": {
      const rot = THREE.MathUtils.degToRad(spec.rotation ?? 90) * (spec.direction === "ccw" ? 1 : -1);
      return [straight(START, clampLen(spec.length, 100), rot)];
    }
    case "offset":
      return [sCurve(clampLen(spec.length, 150), Math.min(MAX_MODEL_MM, spec.offset ?? 20), spec.plane ?? "E")];
    default:
      return [straight(START, clampLen(spec.length, 600))];
  }
}

/** Punto della linea mediana alla distanza d (0..totale). */
function sampler(segs: Segment[]) {
  const total = segs.reduce((s, g) => s + g.len, 0);
  const at = (d: number): Frame => {
    let rest = THREE.MathUtils.clamp(d, 0, total);
    for (const g of segs) {
      if (rest <= g.len || g === segs[segs.length - 1]) return g.at(Math.min(rest, g.len));
      rest -= g.len;
    }
    return segs[0].at(0);
  };
  return { total, at };
}

/* ----------------------------------------------------------------- sezioni */

/** Rettangolo arrotondato centrato, `k` punti per spigolo (stesso numero di punti per ogni raggio). */
function rectPoints(w: number, h: number, r: number, k: number): [number, number][] {
  const rr = Math.max(0.001, Math.min(r, w / 2 - 0.001, h / 2 - 0.001));
  const out: [number, number][] = [];
  const corners: [number, number, number][] = [
    [w / 2 - rr, h / 2 - rr, 0],
    [-w / 2 + rr, h / 2 - rr, Math.PI / 2],
    [-w / 2 + rr, -h / 2 + rr, Math.PI],
    [w / 2 - rr, -h / 2 + rr, (3 * Math.PI) / 2],
  ];
  for (const [cx, cy, a0] of corners) for (let i = 0; i <= k; i++) {
    const a = a0 + (i / k) * (Math.PI / 2);
    out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return out;
}

type Ring = { d: number; w: number; h: number; r: number };

/** Superficie spazzata: anelli lungo la linea mediana. inward = normali verso l'interno (parete interna). */
function sweep(at: (d: number) => Frame, rings: Ring[], k: number, inward = false): THREE.BufferGeometry {
  const M = 4 * (k + 1);
  const pos = new Float32Array(rings.length * M * 3);
  rings.forEach((ring, i) => {
    const f = at(ring.d);
    rectPoints(ring.w, ring.h, ring.r, k).forEach(([x, y], j) => {
      const p = f.p.clone().addScaledVector(f.u, x).addScaledVector(f.v, y);
      pos.set([p.x, p.y, p.z], (i * M + j) * 3);
    });
  });
  const index: number[] = [];
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < M; j++) {
      const a = i * M + j;
      const b = i * M + ((j + 1) % M);
      const c = a + M;
      const e = b + M;
      if (inward) index.push(a, b, c, b, e, c);
      else index.push(a, c, b, b, c, e);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/* ----------------------------------------------------------------- flangia */

/** Flangia da disegnare: quella scelta se esiste per la misura, altrimenti la consigliata (o una quadrata generica). */
export function flangeFor(spec: PartSpec, id: string, wr = spec.wr): FlangeDef {
  const chosen = flangeById(id);
  if (chosen && flangeFits(id, wr)) return chosen;
  const first = flangesFor(wr)[0];
  if (first) return first;
  const s = SIZE_BY_WR.get(spec.wr) ?? SIZE_BY_WR.get("WR-90")!;
  const A = Math.round(s.a * 1.8);
  return { id: "generic", label: "", family: "IEC", style: "plain", shape: "square", A, E: A * 0.39, F: A * 0.37, hole: A * 0.1, C: Math.max(3, A * 0.1), holes: 4 };
}

function rectPath<T extends THREE.Path>(path: T, w: number, h: number, r: number, k = 4): T {
  const pts = rectPoints(w, h, r, k);
  path.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1]);
  path.closePath();
  return path;
}
function circlePath<T extends THREE.Path>(path: T, r: number, x = 0, y = 0): T {
  path.absarc(x, y, r, 0, Math.PI * 2, false);
  return path;
}

/** Un contorno chiuso, usabile sia come sagoma piena sia come foro. */
type Loop = { shape: () => THREE.Shape; hole: () => THREE.Path };
const loop = (draw: (p: THREE.Path) => void): Loop => ({
  shape: () => {
    const s = new THREE.Shape();
    draw(s);
    return s;
  },
  hole: () => {
    const h = new THREE.Path();
    draw(h);
    return h;
  },
});

type Groove = { inner: Loop; outer: Loop; center: [number, number][]; width: number; gasket: boolean };

/** Le gole della flangia (data/flanges.ts → flangeGrooves) come contorni per l'estrusione. */
function grooveLayout(def: FlangeDef, a: number, b: number): Groove[] {
  return flangeGrooves(def, a, b).map((g) => {
    const lo = g.at - g.width / 2;
    const hi = g.at + g.width / 2;
    if (g.shape === "rect") {
      const rr = (grow: number) => loop((p) => rectPath(p, a + 2 * grow, b + 2 * grow, grow * 0.9, 5));
      return { inner: rr(lo), outer: rr(hi), center: rectPoints(a + 2 * g.at, b + 2 * g.at, g.at * 0.9, 6), width: g.width, gasket: g.gasket };
    }
    return {
      inner: loop((p) => circlePath(p, lo)),
      outer: loop((p) => circlePath(p, hi)),
      center: Array.from({ length: 48 }, (_, i) => [Math.cos((i / 48) * Math.PI * 2) * g.at, Math.sin((i / 48) * Math.PI * 2) * g.at] as [number, number]),
      width: g.width,
      gasket: g.gasket,
    };
  });
}

/**
 * Flangia nel suo piano: x = lato largo della guida, y = lato stretto, faccia di accoppiamento a z = 0,
 * spessore verso +z. `plate` è il metallo (fori viti, foro rettangolare interno, gole), `seal` l'o-ring.
 */
function flangeGeometry(def: FlangeDef, a: number, b: number): { plate: THREE.BufferGeometry; seal: THREE.BufferGeometry | null } {
  const { w, h } = flangeOutline(def);
  const outline = loop((p) => (def.shape === "round" ? circlePath(p, def.A / 2) : rectPath(p, w, h, Math.min(w, h) * 0.07)));
  const aperture = loop((p) => rectPath(p, a, b, Math.min(0.5, b * 0.08), 2));
  const holes = flangeHoles(def);
  const boltHoles = () => holes.map(([u, v]) => circlePath(new THREE.Path(), def.hole / 2, u, v));
  const curveSegments = 14;
  const grooves = grooveLayout(def, a, b);

  if (!grooves.length) {
    const s = outline.shape();
    s.holes.push(aperture.hole(), ...boltHoles());
    const bevel = Math.min(0.4, def.C * 0.08);
    const plate = new THREE.ExtrudeGeometry(s, { depth: def.C - 2 * bevel, bevelEnabled: true, bevelSize: bevel, bevelOffset: -bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments });
    plate.translate(0, 0, bevel);
    return { plate, seal: null };
  }

  // strato davanti (profondo quanto la gola) fatto di isole separate dalle gole, e piastra piena dietro
  const g = Math.min(def.C * 0.38, 1.6);
  const front: THREE.Shape[] = [];
  const outer = outline.shape();
  outer.holes.push(...boltHoles(), grooves[grooves.length - 1].outer.hole());
  front.push(outer);
  for (let i = grooves.length - 1; i > 0; i--) {
    const s = grooves[i].inner.shape();
    s.holes.push(grooves[i - 1].outer.hole());
    front.push(s);
  }
  const island = grooves[0].inner.shape();
  island.holes.push(aperture.hole());
  front.push(island);
  const frontGeo = new THREE.ExtrudeGeometry(front, { depth: g, bevelEnabled: false, curveSegments });
  const back = outline.shape();
  back.holes.push(aperture.hole(), ...boltHoles());
  const backGeo = new THREE.ExtrudeGeometry(back, { depth: def.C - g, bevelEnabled: false, curveSegments });
  backGeo.translate(0, 0, g);
  const plate = mergeGeometries([frontGeo, backGeo]) ?? backGeo;
  frontGeo.dispose();
  if (plate !== backGeo) backGeo.dispose();

  const gk = grooves.find((x) => x.gasket);
  let seal: THREE.BufferGeometry | null = null;
  if (gk) {
    const tube = Math.min(gk.width * 0.46, g * 0.62);
    const curve = new THREE.CatmullRomCurve3(gk.center.map(([x, y]) => new V3(x, y, g - tube)), true, "centripetal");
    seal = new THREE.TubeGeometry(curve, 96, tube, 8, true);
  }
  return { plate, seal };
}

/** Matrice che porta la geometria della flangia (piano XY, spessore lungo +Z) sul fotogramma f. */
function frameMatrix(f: Frame, outward: boolean): THREE.Matrix4 {
  const z = outward ? f.t.clone().negate() : f.t.clone();
  const x = f.u.clone();
  const y = new V3().crossVectors(z, x).normalize();
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(f.p);
}

/* ---------------------------------------------------------------- materiali */

/**
 * Aspetto delle finiture (materiali PBR). Colori indicativi del metallo trattato:
 * grezzo = ottone OT 80 non trattato · brillantatura = ottone lucido · argentatura = argento lucido ·
 * verniciatura = vernice (il colore si concorda) · Surtec 650 = passivazione chiara satinata.
 */
const FINISH_LOOK: Record<Finish, { color: string; metalness: number; roughness: number; clearcoat?: number; iridescence?: number; name: string }> = {
  raw: { color: "#b08a52", metalness: 1, roughness: 0.46, name: "Grezzo" },
  bright: { color: BRASS.color, metalness: 1, roughness: 0.16, name: "Brillantatura" },
  silver: { color: "#e9e8e4", metalness: 1, roughness: 0.13, name: "Argentatura" },
  painted: { color: "#2b3442", metalness: 0.05, roughness: 0.5, clearcoat: 0.45, name: "Verniciatura" },
  surtec: { color: "#c5ccd2", metalness: 1, roughness: 0.36, iridescence: 0.35, name: "Surtec 650" },
  tin: { color: "#d4d6d3", metalness: 1, roughness: 0.3, name: "Stagnatura" },
};

function materials(spec: PartSpec) {
  const base = FINISH_LOOK[spec.finish] ?? FINISH_LOOK.raw;
  // alluminio grezzo: grigio, non color ottone
  const look = spec.material === "al" && spec.finish === "raw" ? { ...base, color: "#bfc4c8", roughness: 0.42, name: "Alluminio grezzo" } : base;
  const metal = (roughness: number) =>
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(look.color),
      metalness: look.metalness,
      roughness,
      clearcoat: look.clearcoat ?? 0,
      clearcoatRoughness: 0.28,
      iridescence: look.iridescence ?? 0,
      iridescenceIOR: 1.25,
      side: THREE.DoubleSide,
      name: look.name,
    });
  const body = metal(look.roughness);
  const flange = metal(Math.min(1, look.roughness + 0.05));
  const rubber = new THREE.MeshStandardMaterial({ color: new THREE.Color("#141619"), metalness: 0, roughness: 0.85, name: "O-ring" });
  const jacket = new THREE.MeshPhysicalMaterial({ color: new THREE.Color("#1d2024"), metalness: 0, roughness: 0.6, sheen: 0.4, sheenRoughness: 0.6, side: THREE.DoubleSide, name: "Guaina" });
  return { body, flange, rubber, jacket };
}

/** Texture di rilievo a righe per la corrugazione quando la geometria supererebbe il limite di triangoli. */
function corrugationBump(repeat: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0, "#fff");
  grad.addColorStop(0.5, "#000");
  grad.addColorStop(1, "#fff");
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 64);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, repeat);
  return t;
}

/* -------------------------------------------------------------- costruzione */

export type BuildOptions = {
  /** flessibili senza guaina scelta: la guaina c'è lo stesso, nascosta, e compare solo nella vista esplosa */
  ghostJacket?: boolean;
  /** solo la flangia 1 con un accessorio davanti (copertura TCF o guarnizione TLG) */
  accessory?: Accessory;
};
/** Accessorio da mostrare sulla flangia: quote in mm da data/catalogo-ditta.ts. */
export type Accessory =
  | { kind: "cover"; w: number; h: number; height: number; wall: number; r: number }
  | { kind: "gasket"; w: number; h: number; section: number };
export type PartInfo = {
  group: THREE.Group;
  triangles: number;
  ends: [Frame, Frame];
  size: ReturnType<typeof sizeOf>;
  total: number;
  flanges: [FlangeDef, FlangeDef];
  /** ingombro del pezzo montato, nelle coordinate del modello */
  box: THREE.Box3;
  /** punto a metà del corpo */
  mid: Frame;
};

/** Copertura di protezione: fondo più bordo che abbraccia la flangia, aperta verso la flangia (+z). */
function coverGeometry(a: Extract<Accessory, { kind: "cover" }>): THREE.BufferGeometry {
  const outer = () => rectPath(new THREE.Shape(), a.w, a.h, a.r, 5);
  const plate = new THREE.ExtrudeGeometry(outer(), { depth: a.wall, bevelEnabled: false, curveSegments: 10 });
  const ring = outer();
  ring.holes.push(rectPath(new THREE.Path(), a.w - 2 * a.wall, a.h - 2 * a.wall, Math.max(0.2, a.r - a.wall), 5));
  const rim = new THREE.ExtrudeGeometry(ring, { depth: a.height - a.wall, bevelEnabled: false, curveSegments: 10 });
  rim.translate(0, 0, a.wall);
  const geo = mergeGeometries([plate, rim]) ?? plate;
  rim.dispose();
  if (geo !== plate) plate.dispose();
  return geo;
}

/** Flangia 1 da sola con l'accessorio davanti alla faccia di accoppiamento (che guarda verso -z). */
function buildAccessory(spec: PartSpec, acc: Accessory): PartInfo {
  const size = sizeOf(spec);
  const mats = materials(spec);
  const def = flangeFor(spec, spec.f1);
  const geo = flangeGeometry(def, size.s.a, size.s.b);
  const group = new THREE.Group();
  group.name = "Tecnolambro";
  const flange = new THREE.Group();
  flange.name = "Flangia 1";
  const plate = new THREE.Mesh(geo.plate, mats.flange);
  plate.castShadow = true;
  flange.add(plate);
  // con la guarnizione a catalogo non si disegna l'o-ring generico della gola
  if (geo.seal && acc.kind !== "gasket") flange.add(new THREE.Mesh(geo.seal, mats.rubber));
  else geo.seal?.dispose();
  // tratto di guida dietro la flangia, per far capire dove va montata
  const stub = sweep((d) => ({ p: new V3(0, 0, def.C + d), t: new V3(0, 0, 1), u: new V3(1, 0, 0), v: new V3(0, 1, 0) }), [{ d: 0, w: size.outerW, h: size.outerH, r: 0.6 }, { d: Math.max(size.outerW, 12), w: size.outerW, h: size.outerH, r: 0.6 }], 3);
  const body = new THREE.Mesh(stub, mats.body);
  body.castShadow = true;
  group.add(flange, body);
  const { w, h } = flangeOutline(def);
  let mesh: THREE.Mesh;
  if (acc.kind === "cover") {
    mesh = new THREE.Mesh(coverGeometry(acc), new THREE.MeshPhysicalMaterial({ color: new THREE.Color("#1f63c4"), metalness: 0, roughness: 0.48, clearcoat: 0.25, side: THREE.DoubleSide, name: "LDPE" }));
    mesh.position.z = -acc.wall - 0.3;
    mesh.name = "Copertura";
  } else {
    const pts = rectPoints(acc.w, acc.h, Math.min(acc.w, acc.h) * 0.17, 6).map(([x, y]) => new V3(x, y, 0));
    mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, "centripetal"), 120, acc.section / 2, 10, true), mats.rubber);
    mesh.position.z = -acc.section / 2;
    mesh.name = "Guarnizione";
  }
  mesh.castShadow = true;
  mesh.userData.axis = new V3(0, 0, -1);
  mesh.userData.dist = Math.max(w, h) * 0.9 + 6;
  mesh.userData.rest = 0.5;
  mesh.userData.kind = "accessory";
  group.add(mesh);
  let triangles = 0;
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const g = o.geometry as THREE.BufferGeometry;
      triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
    }
  });
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  const origin: Frame = { p: new V3(0, 0, 0), t: new V3(0, 0, 1), u: new V3(1, 0, 0), v: new V3(0, 1, 0) };
  return { group, triangles: Math.round(triangles), ends: [origin, origin], size, total: 0, flanges: [def, def], box, mid: origin };
}

export function buildPart(spec: PartSpec, opts: BuildOptions = {}): PartInfo {
  if (opts.accessory) return buildAccessory(spec, opts.accessory);
  const size = sizeOf(spec);
  const mats = materials(spec);
  const segs = pathFor(spec);
  const { total, at } = sampler(segs);
  // transizione: la flangia 2 è della seconda misura
  const wr2 = spec.type === "transition" && spec.wr2 && SIZE_BY_WR.has(spec.wr2) ? spec.wr2 : spec.wr;
  const s2 = SIZE_BY_WR.get(wr2)!;
  const defs: [FlangeDef, FlangeDef] = [flangeFor(spec, spec.f1), flangeFor(spec, spec.type === "termination" ? spec.f1 : spec.f2, wr2)];
  const from = Math.min(defs[0].C, total / 3);
  const to = Math.max(total - defs[1].C, (2 * total) / 3);
  const group = new THREE.Group();
  group.name = "Tecnolambro";
  const k = 3;
  const M = 4 * (k + 1);
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, name: string) => {
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    m.castShadow = true;
    group.add(m);
    return m;
  };

  // distanze di campionamento: confini dei segmenti + passo di ogni segmento
  const ds: number[] = [];
  let acc = 0;
  for (const g of segs) {
    const n = Math.max(1, Math.ceil(g.len / g.step));
    for (let i = 0; i < n; i++) ds.push(acc + (g.len * i) / n);
    acc += g.len;
  }
  ds.push(total);
  const between = (d0: number, d1: number) => [d0, ...ds.filter((d) => d > d0 && d < d1), d1];
  const bodyD = between(from, to);

  if (isFlexible(spec.type)) {
    const f = size.flex;
    // corrugazioni vere, passo P della tabella TLFX: creste larghe e gole strette per la twistabile
    // (nastro aggraffato), onda morbida per la seamless (soffietto senza saldature)
    const sharp = spec.type === "twistable" ? 0.55 : 1;
    const pitches = (to - from) / f.P;
    const perPitch = Math.max(2, Math.min(6, Math.floor((TRIANGLE_BUDGET * 0.66) / (2 * M) / Math.max(1, pitches))));
    const ringsCount = Math.round(pitches * perPitch) + 1;
    if (ringsCount * M * 2 <= TRIANGLE_BUDGET * 0.7 && perPitch >= 2) {
      const rings: Ring[] = [];
      for (let i = 0; i < ringsCount; i++) {
        const d = from + ((to - from) * i) / (ringsCount - 1);
        const s = Math.pow(0.5 + 0.5 * Math.cos((2 * Math.PI * (d - from)) / f.P), sharp);
        rings.push({ d, w: f.C + (f.A - f.C) * s, h: f.D + (f.B - f.D) * s, r: f.r + (f.R - f.r) * s });
      }
      add(sweep(at, rings, k), mats.body, "Guida corrugata");
    } else {
      // troppo lunga per la corrugazione in geometria: tubo liscio con rilievo a righe
      const mid = { w: (f.A + f.C) / 2, h: (f.B + f.D) / 2, r: (f.R + f.r) / 2 };
      const geo = sweep(at, bodyD.map((d) => ({ d, ...mid })), k);
      const uv = new Float32Array(geo.attributes.position.count * 2);
      bodyD.forEach((d, i) => {
        for (let j = 0; j < M; j++) uv.set([j / M, (d - from) / (to - from)], (i * M + j) * 2);
      });
      geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      const m = mats.body.clone();
      m.bumpMap = corrugationBump(pitches);
      m.bumpScale = 2;
      add(geo, m, "Guida corrugata");
    }
    // manicotti di attacco alle flange
    const collarLen = Math.min(f.B * 0.9, 12, (to - from) / 6);
    const sleeve = { w: f.A + 1.6, h: f.B + 1.6, r: f.R + 0.8 };
    const neck = { w: f.A, h: f.B, r: f.R };
    add(sweep(at, [{ d: from, ...sleeve }, { d: from + collarLen, ...sleeve }, { d: from + collarLen + 0.8, ...neck }], k), mats.flange, "Manicotto 1");
    add(sweep(at, [{ d: to - collarLen - 0.8, ...neck }, { d: to - collarLen, ...sleeve }, { d: to, ...sleeve }], k), mats.flange, "Manicotto 2");
    // guaina in gomma tra i due manicotti
    if (spec.jacket || opts.ghostJacket) {
      const j = { w: f.A + 2.6, h: f.B + 2.6, r: f.R + 1.3 };
      const mat = mats.jacket;
      const ghost = !spec.jacket;
      if (ghost) {
        mat.transparent = true;
        mat.opacity = 0;
        mat.depthWrite = false;
      }
      const mesh = add(sweep(at, between(from + collarLen * 0.5, to - collarLen * 0.5).map((d) => ({ d, ...j })), k), mat, "Guaina");
      mesh.userData.axis = new V3(0, 1, 0);
      mesh.userData.dist = f.B * 2 + 14;
      mesh.userData.kind = "jacket";
      mesh.userData.ghost = ghost;
      if (ghost) {
        mesh.visible = false;
        mesh.castShadow = false;
      }
    }
  } else {
    // guida rigida: parete esterna e parete interna con le proporzioni reali a × b
    const outer = { w: size.rigid.w, h: size.rigid.h, r: 0.6 };
    const inner = { w: size.s.a, h: size.s.b, r: 0.2 };
    if (wr2 !== spec.wr) {
      // transizione: la sezione passa da a × b della misura 1 a quella della misura 2 nel tratto centrale
      const o2 = rigidOuter(s2);
      const mix = (d: number) => THREE.MathUtils.smoothstep(d, from + (to - from) * 0.15, to - (to - from) * 0.15);
      const lerp = (x: number, y: number, d: number) => x + (y - x) * mix(d);
      const taper = between(from, to).flatMap((d, i, all) => (i ? [(all[i - 1] + d) / 2, d] : [d]));
      add(sweep(at, taper.map((d) => ({ d, w: lerp(outer.w, o2.w, d), h: lerp(outer.h, o2.h, d), r: 0.6 })), k), mats.body, "Guida");
      add(sweep(at, taper.map((d) => ({ d, w: lerp(inner.w, s2.a, d), h: lerp(inner.h, s2.b, d), r: 0.2 })), k, true), mats.body, "Guida interno");
    } else {
      add(sweep(at, bodyD.map((d) => ({ d, ...outer })), k), mats.body, "Guida");
      add(sweep(at, bodyD.map((d) => ({ d, ...inner })), k, true), mats.body, "Guida interno");
    }
  }

  // flange alle due estremità, con la faccia di accoppiamento sul fondo del percorso
  const startF = at(0);
  const endF = at(total);
  const geos = new Map<string, ReturnType<typeof flangeGeometry>>();
  const flangeGroup = (def: FlangeDef, frame: Frame, outward: boolean, name: string) => {
    const geo = geos.get(def.id) ?? flangeGeometry(def, size.s.a, size.s.b);
    geos.set(def.id, geo);
    const g = new THREE.Group();
    g.name = name;
    const plate = new THREE.Mesh(geo.plate, mats.flange);
    plate.castShadow = true;
    g.add(plate);
    if (geo.seal) {
      const seal = new THREE.Mesh(geo.seal, mats.rubber);
      seal.name = "O-ring";
      g.add(seal);
    }
    g.applyMatrix4(frameMatrix(frame, outward));
    const { w, h } = flangeOutline(def);
    g.userData.axis = outward ? frame.t.clone() : frame.t.clone().negate();
    g.userData.dist = Math.max(w, h) * 0.9 + 8;
    g.userData.kind = "flange";
    group.add(g);
  };
  flangeGroup(defs[0], startF, false, "Flangia 1");
  if (spec.type === "termination") {
    // terminazione: lato 2 chiuso da un fondello (il carico è all'interno)
    const capT = Math.max(2, size.flangeT * 0.5);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(size.rigid.w + 1.2, size.rigid.h + 1.2, capT), mats.flange);
    cap.applyMatrix4(frameMatrix(at(Math.max(0, total - capT / 2)), true));
    cap.name = "Fondello";
    cap.castShadow = true;
    group.add(cap);
  } else {
    if (wr2 !== spec.wr) {
      const geo = flangeGeometry(defs[1], s2.a, s2.b);
      geos.set(defs[1].id, geo);
    }
    flangeGroup(defs[1], endF, true, "Flangia 2");
  }
  if (spec.type === "pressure") {
    // ingresso dell'aria a metà del tronchetto
    const m = at(total / 2);
    const r = Math.max(2.5, Math.min(6, size.rigid.h * 0.22));
    const hgt = size.rigid.h * 0.5 + r * 2.4;
    const inlet = new THREE.Mesh(new THREE.CylinderGeometry(r, r, hgt, 24), mats.flange);
    inlet.position.copy(m.p).addScaledVector(m.v, hgt / 2);
    inlet.quaternion.setFromUnitVectors(new V3(0, 1, 0), m.v.clone().normalize());
    inlet.name = "Ingresso aria";
    inlet.castShadow = true;
    group.add(inlet);
  }

  let triangles = 0;
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const g = o.geometry as THREE.BufferGeometry;
      triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
    }
  });
  group.updateMatrixWorld(true);
  const box = new THREE.Box3();
  group.traverse((o) => {
    if (o instanceof THREE.Mesh && !o.userData.ghost) box.expandByObject(o);
  });
  return { group, triangles: Math.round(triangles), ends: [startF, endF], size, total, flanges: defs, box, mid: at(total / 2) };
}

export function disposeGroup(group: THREE.Object3D) {
  const seen = new Set<unknown>();
  group.traverse((o) => {
    if (o instanceof THREE.Line) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
      return;
    }
    if (!(o instanceof THREE.Mesh)) return;
    if (!seen.has(o.geometry)) {
      (o.geometry as THREE.BufferGeometry).dispose();
      seen.add(o.geometry);
    }
    const m = o.material as THREE.MeshStandardMaterial;
    if (!seen.has(m)) {
      m.bumpMap?.dispose();
      m.dispose();
      seen.add(m);
    }
  });
}

/* -------------------------------------------------------------------- quote */

export type DimLabel = { text: string; at: THREE.Vector3 };

/**
 * Quote disegnate nel 3D, nelle coordinate del modello. Pezzi dritti (flessibili, twist, disassati):
 * la lunghezza L è quotata a terra, davanti al pezzo, con le linee di riferimento dalle facce delle
 * flange. Curve: L1, L2 e angolo di fianco al pezzo.
 */
export function dimLabels(spec: PartSpec, info: PartInfo, fmt: (v: number) => string): { labels: DimLabel[]; lines: [THREE.Vector3, THREE.Vector3][] } {
  const { at, total } = sampler(pathFor(spec));
  const off = Math.max(info.size.outerW, info.size.outerH) * 1.4 + 6;
  const labels: DimLabel[] = [];
  const lines: [THREE.Vector3, THREE.Vector3][] = [];
  if (spec.type === "bend") {
    const reach = Math.max(...info.flanges.map((d) => (spec.plane === "H" ? flangeOutline(d).h : flangeOutline(d).w))) / 2 + 8;
    const side = (f: Frame) => f.p.clone().addScaledVector(spec.plane === "H" ? f.v : f.u, reach);
    const l1 = spec.leg1 ?? 100;
    const R = visualBendRadius(spec);
    const arcLen = R * THREE.MathUtils.degToRad(spec.angle ?? 90);
    const a = at(0), b = at(l1), c = at(l1 + arcLen), d = at(total);
    lines.push([side(a), side(b)], [side(c), side(d)], [a.p.clone(), side(a)], [d.p.clone(), side(d)]);
    labels.push({ text: `L1 = ${fmt(l1)} mm`, at: side(at(l1 / 2)) });
    labels.push({ text: `L2 = ${fmt(spec.leg2 ?? 100)} mm`, at: side(at(l1 + arcLen + (spec.leg2 ?? 100) / 2)) });
    const mid = at(l1 + arcLen / 2);
    labels.push({ text: `${fmt(spec.angle ?? 90)}°${spec.radius ? ` · R ${fmt(spec.radius)}` : ""}`, at: mid.p.clone().addScaledVector(spec.plane === "H" ? mid.u : mid.v, -off) });
    return { labels, lines };
  }
  const a = at(0), b = at(total);
  const y = info.box.min.y + 0.3;
  const margin = Math.max(8, (info.box.max.x - info.box.min.x) * 0.28);
  const x = info.box.max.x + margin;
  const tick = margin * 0.3;
  const pa = new V3(x, y, a.p.z), pb = new V3(x, y, b.p.z);
  lines.push([pa, pb]);
  for (const p of [pa, pb]) {
    lines.push([new V3(info.box.max.x - margin * 0.4, y, p.z), new V3(x + tick, y, p.z)]);
    lines.push([new V3(x - tick, y, p.z - tick), new V3(x + tick, y, p.z + tick)]);
  }
  labels.push({ text: `L = ${fmt(spec.length ?? 0)} mm`, at: pa.clone().lerp(pb, 0.5) });
  const m = at(total / 2);
  if (spec.type === "twist") labels.push({ text: `${fmt(spec.rotation ?? 90)}° ${spec.direction === "ccw" ? "↺" : "↻"}`, at: m.p.clone().add(new V3(0, off, 0)) });
  if (spec.type === "offset") labels.push({ text: `X = ${fmt(spec.offset ?? 0)} mm`, at: b.p.clone().addScaledVector(spec.plane === "H" ? b.u : b.v, -off) });
  return { labels, lines };
}

/* ------------------------------------------------------------------ viewer */

export type ViewPreset = "iso" | "front" | "side";
export type ViewFocus = "all" | "f1" | "f2";
/** Testi delle etichette ancorate al modello (già tradotti). */
export type ViewerLabels = { flange1: string; flange2: string; f1: string; f2: string; body?: string; jacket?: string; /** nome e codice dell'accessorio */ accessory?: string; accessoryCode?: string };
export type ViewerOptions = {
  /** ruota da solo e riparte qualche secondo dopo l'ultimo tocco */
  autoRotate?: boolean;
  /** ombra morbida a terra */
  shadow?: boolean;
  /** quote visibili dall'inizio */
  dims?: boolean;
  labels?: ViewerLabels;
};
export type Viewer = {
  setSpec: (spec: PartSpec, labels?: ViewerLabels, accessory?: Accessory | null) => void;
  setView: (v: ViewPreset) => void;
  setDims: (on: boolean) => void;
  setExploded: (on: boolean) => void;
  /** inquadra tutto il pezzo oppure una flangia da vicino */
  setFocus: (f: ViewFocus) => void;
  /** immagine PNG della vista corrente */
  snapshot: () => string;
  triangles: () => number;
  dispose: () => void;
};

/** Studio fotografico per i riflessi: stanza grigia con softbox in alto, due strisce laterali e una luce di taglio. */
function studioScene(): THREE.Scene {
  const s = new THREE.Scene();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const panel = (color: number, intensity: number, pos: [number, number, number], scale: [number, number, number]) => {
    const mat = new THREE.MeshBasicMaterial({ color });
    mat.color.multiplyScalar(intensity);
    const m = new THREE.Mesh(box, mat);
    m.position.set(...pos);
    m.scale.set(...scale);
    s.add(m);
  };
  const walls = new THREE.MeshBasicMaterial({ color: 0x8f98a3, side: THREE.BackSide });
  walls.color.multiplyScalar(0.3);
  const room = new THREE.Mesh(box, walls);
  room.scale.set(44, 26, 44);
  room.position.y = 9;
  s.add(room);
  panel(0xffffff, 0.5, [0, -3.9, 0], [44, 0.1, 44]); // pavimento
  panel(0xffffff, 15, [0, 15, 1], [18, 0.2, 11]); // softbox in alto
  panel(0xffffff, 10, [-15, 6, 5], [0.2, 10, 5]); // striscia sinistra
  panel(0xfff1dd, 8, [15, 5, -3], [0.2, 8, 9]); // striscia destra, calda
  panel(0xdce8ff, 7, [0, 6, -17], [15, 5, 0.2]); // controluce freddo
  panel(0xffffff, 5, [5, 3, 17], [6, 3, 0.2]); // schiarita frontale
  return s;
}

export async function mountViewer(container: HTMLElement, spec: PartSpec, fmt: (v: number) => string, opts: ViewerOptions = {}): Promise<Viewer> {
  const [{ OrbitControls }, { CSS2DRenderer, CSS2DObject }] = await Promise.all([
    import("three/examples/jsm/controls/OrbitControls.js"),
    import("three/examples/jsm/renderers/CSS2DRenderer.js"),
  ]);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const shadows = opts.shadow !== false;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
  container.appendChild(renderer.domElement);
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden";
  container.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = studioScene();
  const env = pmrem.fromScene(studio, 0.03);
  scene.environment = env.texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.castShadow = shadows;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 7;
  key.shadow.blurSamples = 14;
  key.shadow.bias = -0.0004;
  scene.add(key, key.target);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.24 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.visible = shadows;
  scene.add(ground);

  const accent = new THREE.Color(getComputedStyle(container).getPropertyValue("--c-accent").trim() || "#0066cc");
  const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 50000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  // la rotella e il pinch scorrono la pagina (niente zoom); il trascinamento in orizzontale ruota
  // il modello, quello in verticale su touch scorre la pagina (OrbitControls metterebbe touch-action: none)
  controls.enableZoom = false;
  renderer.domElement.style.touchAction = "pan-y";
  controls.autoRotateSpeed = 0.9;
  controls.maxPolarAngle = Math.PI * 0.495;

  let current: PartInfo | null = null;
  let currentSpec = spec;
  let labels = opts.labels;
  let accessory: Accessory | null = null;
  let dims = Boolean(opts.dims);
  let exploded = 0;
  let explodedTarget = 0;
  let focus: ViewFocus = "all";
  let view: ViewPreset = "iso";
  let touching = false;
  let resumeTimer = 0;
  let onScreen = true;
  let lastRadius = 0;
  /** oggetti che si spostano nell'esploso: flange, guaina e le loro etichette */
  let movers: THREE.Object3D[] = [];
  let dimGroup: THREE.Group | null = null;
  let explodedTags: HTMLElement[] = [];
  /** etichette FLANGIA 1 / FLANGIA 2 da ridisegnare nella foto del datasheet (le CSS2D non sono nel canvas) */
  let snapTags: { obj: THREE.Object3D; title: string; code: string }[] = [];
  const camAnim = { from: new V3(), to: new V3(), tFrom: new V3(), tTo: new V3(), start: 0, ms: 600, active: false };

  /* ---------------------------------------------------------- inquadrature */
  const world = (p: THREE.Vector3) => p.clone().add(current!.group.position);
  const hfov = () => 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
  const poseAll = () => {
    const box = current!.box.clone().translate(current!.group.position);
    const c = box.getCenter(new V3());
    const sz = box.getSize(new V3());
    const spread = explodedTarget ? Math.max(...movers.map((m) => (m.userData.kind === "flange" ? (m.userData.dist as number) : 0)), 0) : 0;
    const rxz = Math.hypot(sz.x, sz.z) / 2 + spread;
    const hy = sz.y / 2 + (explodedTarget ? Math.max(...movers.map((m) => (m.userData.kind === "jacket" ? (m.userData.dist as number) : 0)), 0) : 0);
    const vf = THREE.MathUtils.degToRad(camera.fov / 2);
    const elev = view === "iso" ? 0.36 : 0.06;
    const dist = Math.max(rxz / Math.tan(hfov() / 2), (hy * 1.5 + rxz * Math.sin(elev)) / Math.tan(vf)) * (labels ? 1.22 : 1.08) + rxz * 0.18;
    const az = view === "front" ? -Math.PI / 2 : view === "side" ? 0 : accessory ? -1.05 : -0.62;
    const dir = new V3(Math.cos(az) * Math.cos(elev), Math.sin(elev), Math.sin(az) * Math.cos(elev));
    return { pos: c.clone().addScaledVector(dir, dist), target: c, dist, radius: rxz };
  };
  const poseFlange = (i: 0 | 1) => {
    const fr = current!.ends[i];
    const def = current!.flanges[i];
    const out = i === 0 ? fr.t.clone().negate() : fr.t.clone();
    const mover = movers.find((m) => m.userData.kind === "flange" && m.name === (i === 0 ? "Flangia 1" : "Flangia 2"));
    const shift = mover ? (mover.userData.dist as number) * explodedTarget : 0;
    const c = world(fr.p).addScaledVector(out, shift);
    const { w, h } = flangeOutline(def);
    const sizeMm = Math.max(w, h);
    const side = Math.abs(fr.u.y) > 0.9 ? fr.v.clone() : fr.u.clone();
    const dir = out.clone().multiplyScalar(1).addScaledVector(side, 0.55).add(new V3(0, 0.34, 0)).normalize();
    if (dir.y < 0.12) dir.setY(0.12).normalize();
    const fit = (sizeMm * 2.35) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / Math.min(1, camera.aspect);
    return { pos: c.clone().addScaledVector(dir, fit), target: c.clone().add(new V3(0, sizeMm * 0.3, 0)), dist: fit, radius: sizeMm };
  };
  const placeCamera = (instant: boolean, ms = 600) => {
    if (!current) return;
    const all = poseAll();
    const p = focus === "all" ? all : poseFlange(focus === "f1" ? 0 : 1);
    camera.near = Math.max(0.2, p.dist / 300);
    camera.far = all.dist * 30;
    camera.updateProjectionMatrix();
    controls.minDistance = Math.max(8, Math.max(...current.flanges.map((d) => flangeOutline(d).w)) * 0.7);
    controls.maxDistance = all.dist * 2.6;
    if (instant || reduced) {
      camera.position.copy(p.pos);
      controls.target.copy(p.target);
      controls.update();
      camAnim.active = false;
      return;
    }
    Object.assign(camAnim, { from: camera.position.clone(), to: p.pos, tFrom: controls.target.clone(), tTo: p.target, start: performance.now(), ms, active: true });
  };

  /* --------------------------------------------------- etichette e quote */
  const line = (pts: THREE.Vector3[], opacity = 1) =>
    new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: accent, transparent: opacity < 1, opacity }));
  const tag = (title: string, code: string, cls = "") => {
    const el = document.createElement("div");
    el.className = `p3d-tag ${cls}`.trim();
    const b = document.createElement("b");
    b.textContent = title;
    el.append(b);
    if (code) {
      const c = document.createElement("span");
      c.textContent = code;
      el.append(c);
    }
    return el;
  };
  const decorate = () => {
    if (!current) return;
    const info = current;
    movers = info.group.children.filter((c) => c.userData.axis);
    explodedTags = [];
    snapTags = [];
    dimGroup = null;
    if (labels) {
      // FLANGIA 1 / FLANGIA 2 con la sigla scelta, ancorate sopra ogni flangia
      ([0, 1] as const).forEach((i) => {
        const fr = info.ends[i];
        const def = info.flanges[i];
        const flange = info.group.children.find((c) => c.name === (i === 0 ? "Flangia 1" : "Flangia 2"));
        if (!flange) return;
        const fb = new THREE.Box3().setFromObject(flange);
        const inward = i === 0 ? fr.t.clone() : fr.t.clone().negate();
        const c = fr.p.clone().addScaledVector(inward, def.C / 2);
        const top = fb.max.y - info.group.position.y;
        const stem = Math.max(7, (fb.max.y - fb.min.y) * 0.42);
        const anchor = new THREE.Group();
        anchor.userData = { axis: flange.userData.axis ?? new V3(), dist: flange.userData.dist ?? 0, kind: "tag" };
        anchor.add(line([new V3(c.x, top + 0.6, c.z), new V3(c.x, top + stem, c.z)]));
        const obj = new CSS2DObject(tag(i === 0 ? labels!.flange1 : labels!.flange2, i === 0 ? labels!.f1 : labels!.f2));
        snapTags.push({ obj, title: i === 0 ? labels!.flange1 : labels!.flange2, code: i === 0 ? labels!.f1 : labels!.f2 });
        obj.center.set(0.5, 1);
        obj.position.set(c.x, top + stem, c.z);
        anchor.add(obj);
        info.group.add(anchor);
        movers.push(anchor);
      });
      // accessorio (copertura o guarnizione): etichetta con il codice, sempre visibile
      const accMesh = info.group.children.find((c) => c.userData.kind === "accessory");
      if (accMesh && labels.accessory) {
        const ab = new THREE.Box3().setFromObject(accMesh);
        const obj = new CSS2DObject(tag(labels.accessory, labels.accessoryCode ?? ""));
        obj.center.set(0.5, 0);
        obj.position.set(0, ab.min.y - info.group.position.y - 4, accMesh.position.z);
        const anchor = new THREE.Group();
        anchor.userData = { axis: accMesh.userData.axis, dist: accMesh.userData.dist, rest: accMesh.userData.rest, kind: "tag" };
        anchor.add(obj);
        info.group.add(anchor);
        movers.push(anchor);
      }
      // corpo e guaina: nominati solo nella vista esplosa
      if (labels.body && !accessory) {
        const el = tag(labels.body, "", "p3d-tag-part");
        const obj = new CSS2DObject(el);
        obj.center.set(0.5, 0);
        obj.position.copy(info.mid.p).add(new V3(0, -info.size.outerH * 0.9 - 3, 0));
        info.group.add(obj);
        explodedTags.push(el);
      }
      const jacket = info.group.children.find((c) => c.userData.kind === "jacket");
      if (jacket && labels.jacket) {
        const el = tag(labels.jacket, "", "p3d-tag-part");
        const obj = new CSS2DObject(el);
        obj.center.set(0.5, 1);
        obj.position.copy(info.mid.p).add(new V3(0, info.size.outerH * 0.9 + 3, 0));
        const anchor = new THREE.Group();
        anchor.userData = { axis: jacket.userData.axis, dist: jacket.userData.dist, kind: "tag" };
        anchor.add(obj);
        info.group.add(anchor);
        movers.push(anchor);
        explodedTags.push(el);
      }
    }
    if (currentSpec.type !== "custom" && !accessory) {
      // quota della lunghezza, disegnata nel 3D
      dimGroup = new THREE.Group();
      const d = dimLabels(currentSpec, info, fmt);
      for (const [a, b] of d.lines) dimGroup.add(line([a, b]));
      for (const l of d.labels) {
        const el = document.createElement("span");
        el.textContent = l.text;
        el.className = "part3d-dim";
        const obj = new CSS2DObject(el);
        obj.position.copy(l.at);
        dimGroup.add(obj);
      }
      info.group.add(dimGroup);
    }
    applyExplode();
  };
  /** Toglie dal DOM le etichette di un pezzo che esce di scena. */
  const removeTags = (g: THREE.Object3D) => g.traverse((o) => o instanceof CSS2DObject && o.element.remove());

  const applyExplode = () => {
    if (!current) return;
    for (const m of movers) {
      if (!m.userData.base) m.userData.base = m.position.clone();
      const rest = (m.userData.rest as number | undefined) ?? 0;
      const k = Math.min(1.2, rest + exploded * (1 - rest) + ((m.userData.pop as number | undefined) ?? 0));
      m.position.copy((m.userData.base as THREE.Vector3).clone().addScaledVector(m.userData.axis as THREE.Vector3, (m.userData.dist as number) * k));
      if (m.userData.ghost && m instanceof THREE.Mesh) {
        m.visible = exploded > 0.02;
        (m.material as THREE.Material).opacity = Math.min(0.55, exploded * 0.55);
      }
    }
    for (const el of explodedTags) el.style.opacity = String(Math.max(0, Math.min(1, exploded * 2 - 0.6)));
    if (dimGroup) {
      const show = dims && exploded < 0.05 && focus === "all";
      dimGroup.visible = show;
      dimGroup.traverse((o) => o instanceof CSS2DObject && (o.element.style.visibility = show ? "" : "hidden"));
    }
  };

  /* -------------------------------------------------------------- ciclo */
  const rotating = () => Boolean(opts.autoRotate) && !reduced && !touching && focus === "all" && onScreen && !document.hidden && !camAnim.active;
  let frame = 0;
  let last = performance.now();
  const tick = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      controls.autoRotate = rotating();
      let busy = controls.update(dt) || controls.autoRotate;
      if (camAnim.active) {
        const p = Math.min(1, (now - camAnim.start) / camAnim.ms);
        const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        camera.position.lerpVectors(camAnim.from, camAnim.to, e);
        controls.target.lerpVectors(camAnim.tFrom, camAnim.tTo, e);
        camera.lookAt(controls.target);
        if (p >= 1) camAnim.active = false;
        busy = true;
      }
      let moving = false;
      if (Math.abs(exploded - explodedTarget) > 0.001) {
        exploded += (explodedTarget - exploded) * Math.min(1, dt * 7);
        if (Math.abs(exploded - explodedTarget) < 0.004) exploded = explodedTarget;
        moving = true;
      }
      for (const m of movers) {
        const pop = m.userData.pop as number | undefined;
        if (pop) {
          m.userData.pop = pop < 0.004 ? 0 : pop * Math.max(0, 1 - dt * 6);
          moving = true;
        }
      }
      if (moving) {
        applyExplode();
        busy = true;
      }
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      if (busy) tick();
    });
  };

  const stage = () => {
    if (!current) return;
    // pezzo appoggiato a terra e centrato; luce e ombra dimensionate sul pezzo
    const c = current.box.getCenter(new V3());
    current.group.position.set(-c.x, -current.box.min.y, -c.z);
    current.group.updateMatrixWorld(true);
    const sz = current.box.getSize(new V3());
    const r = Math.max(sz.length() / 2, 30);
    key.position.set(r * 0.5, r * 2.2 + sz.y, r * 0.8);
    key.target.position.set(0, sz.y / 2, 0);
    const cam = key.shadow.camera;
    cam.left = cam.bottom = -r * 1.5;
    cam.right = cam.top = r * 1.5;
    cam.near = r * 0.2;
    cam.far = r * 6;
    cam.updateProjectionMatrix();
    ground.scale.setScalar(r * 12);
  };

  const setSpec = (next: PartSpec, nextLabels?: ViewerLabels, nextAccessory?: Accessory | null) => {
    const prev = currentSpec;
    const had = current;
    currentSpec = next;
    if (nextLabels) labels = nextLabels;
    if (nextAccessory !== undefined) accessory = nextAccessory;
    if (had) {
      scene.remove(had.group);
      removeTags(had.group);
      disposeGroup(had.group);
    }
    current = buildPart(next, { ghostJacket: Boolean(labels?.jacket), accessory: accessory ?? undefined });
    scene.add(current.group);
    stage();
    decorate();
    // montaggio: la flangia appena cambiata arriva dall'esterno e si accosta al corpo
    if (had && !reduced && prev.type === next.type && prev.wr === next.wr) {
      for (const [k, name] of [["f1", "Flangia 1"], ["f2", "Flangia 2"]] as const) {
        if (prev[k] !== next[k]) for (const m of movers) if (m.name === name || (m.userData.kind === "tag" && m.userData.axis === current.group.children.find((c) => c.name === name)?.userData.axis)) m.userData.pop = 0.55;
      }
      applyExplode();
    }
    const radius = poseAll().radius;
    const first = !had;
    if (first) placeCamera(true);
    else if (focus !== "all" || Math.abs(radius - lastRadius) > lastRadius * 0.02) placeCamera(false, 450);
    lastRadius = radius;
    tick();
  };

  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    labelRenderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (current && !touching) placeCamera(true);
    tick();
  };
  const onStart = () => {
    touching = true;
    camAnim.active = false;
    window.clearTimeout(resumeTimer);
  };
  const onEnd = () => {
    window.clearTimeout(resumeTimer);
    // riparte da solo dopo qualche secondo di pausa
    resumeTimer = window.setTimeout(() => {
      touching = false;
      tick();
    }, 3500);
  };
  const onVisibility = () => tick();
  controls.addEventListener("change", tick);
  controls.addEventListener("start", onStart);
  controls.addEventListener("end", onEnd);
  document.addEventListener("visibilitychange", onVisibility);
  const io = new IntersectionObserver((entries) => {
    onScreen = entries.some((e) => e.isIntersecting);
    if (onScreen) tick();
  });
  io.observe(container);
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  const w0 = container.clientWidth || 1;
  const h0 = container.clientHeight || 1;
  renderer.setSize(w0, h0, false);
  labelRenderer.setSize(w0, h0);
  camera.aspect = w0 / h0;
  camera.updateProjectionMatrix();
  setSpec(spec);

  return {
    setSpec,
    setView: (v) => {
      view = v;
      focus = "all";
      placeCamera(false);
      tick();
    },
    setDims: (on) => {
      dims = on;
      applyExplode();
      tick();
    },
    setExploded: (on) => {
      explodedTarget = on ? 1 : 0;
      placeCamera(false, 700);
      tick();
    },
    setFocus: (f) => {
      if (f === focus) return;
      focus = f;
      applyExplode();
      touching = false;
      window.clearTimeout(resumeTimer);
      placeCamera(false, 800);
      tick();
    },
    snapshot: () => {
      renderer.render(scene, camera);
      const src = renderer.domElement;
      if (!snapTags.length) return src.toDataURL("image/png");
      // foto con le etichette FLANGIA 1 / FLANGIA 2 disegnate sopra, nella posizione che hanno a schermo
      const out = document.createElement("canvas");
      out.width = src.width;
      out.height = src.height;
      const g = out.getContext("2d");
      if (!g) return src.toDataURL("image/png");
      g.drawImage(src, 0, 0);
      const k = src.width / Math.max(1, container.clientWidth);
      const pad = 6 * k;
      for (const tg of snapTags) {
        const p = tg.obj.getWorldPosition(new V3()).project(camera);
        if (p.z > 1) continue;
        const x = ((p.x + 1) / 2) * src.width;
        const y = ((1 - p.y) / 2) * src.height;
        g.font = `700 ${11 * k}px Arial, sans-serif`;
        const w1 = g.measureText(tg.title).width;
        g.font = `600 ${11 * k}px Consolas, monospace`;
        const w2 = tg.code ? g.measureText(tg.code).width : 0;
        const w = Math.max(w1, w2) + pad * 2;
        const h = (tg.code ? 32 : 18) * k;
        const bx = Math.min(Math.max(2, x - w / 2), src.width - w - 2);
        const by = Math.max(2, y - h);
        g.fillStyle = "rgba(255,255,255,0.92)";
        g.strokeStyle = "#0066cc";
        g.lineWidth = 1.5 * k;
        g.beginPath();
        g.roundRect(bx, by, w, h, 4 * k);
        g.fill();
        g.stroke();
        g.fillStyle = "#1a1f26";
        g.textBaseline = "top";
        g.font = `700 ${11 * k}px Arial, sans-serif`;
        g.fillText(tg.title, bx + pad, by + 4 * k);
        if (tg.code) {
          g.fillStyle = "#3b4654";
          g.font = `600 ${11 * k}px Consolas, monospace`;
          g.fillText(tg.code, bx + pad, by + 17 * k);
        }
      }
      return out.toDataURL("image/png");
    },
    triangles: () => current?.triangles ?? 0,
    dispose: () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(resumeTimer);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      controls.dispose();
      if (current) {
        removeTags(current.group);
        disposeGroup(current.group);
      }
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      env.dispose();
      studio.traverse((o) => o instanceof THREE.Mesh && (o.geometry.dispose(), (o.material as THREE.Material).dispose()));
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      labelRenderer.domElement.remove();
    },
  };
}

/* ------------------------------------------------------------------ export */

function exportGroup(spec: PartSpec): THREE.Group {
  const g = buildPart(spec).group;
  g.updateMatrixWorld(true);
  return g;
}

export async function exportStl(spec: PartSpec): Promise<ArrayBuffer> {
  const { STLExporter } = await import("three/examples/jsm/exporters/STLExporter.js");
  const g = exportGroup(spec);
  const data = new STLExporter().parse(g, { binary: true }) as DataView;
  disposeGroup(g);
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

/** GLB in metri (convenzione glTF). */
export async function exportGlb(spec: PartSpec): Promise<ArrayBuffer> {
  const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
  const scene = new THREE.Scene();
  const g = exportGroup(spec);
  g.scale.setScalar(0.001);
  scene.add(g);
  const out = (await new GLTFExporter().parseAsync(scene, { binary: true })) as ArrayBuffer;
  disposeGroup(g);
  return out;
}

/** USDZ per "Vedi nel tuo spazio" su iPhone/iPad (AR Quick Look), in metri. */
export async function exportUsdz(spec: PartSpec): Promise<Uint8Array> {
  const { USDZExporter } = await import("three/examples/jsm/exporters/USDZExporter.js");
  const scene = new THREE.Scene();
  const g = exportGroup(spec);
  g.scale.setScalar(0.001);
  scene.add(g);
  const out = await new USDZExporter().parseAsync(scene);
  disposeGroup(g);
  return out;
}

/** Anteprima 3D di un file STL caricato dal cliente (solo visualizzazione, nessun invio). */
export async function mountStlPreview(container: HTMLElement, file: File): Promise<() => void> {
  const [{ OrbitControls }, { STLLoader }, { RoomEnvironment }] = await Promise.all([
    import("three/examples/jsm/controls/OrbitControls.js"),
    import("three/examples/jsm/loaders/STLLoader.js"),
    import("three/examples/jsm/environments/RoomEnvironment.js"),
  ]);
  const geo = new STLLoader().parse(await file.arrayBuffer());
  geo.computeVertexNormals();
  geo.center();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = env.texture;
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: new THREE.Color(BRASS.color), metalness: 0.9, roughness: 0.35, side: THREE.DoubleSide }));
  scene.add(mesh);
  geo.computeBoundingSphere();
  const r = geo.boundingSphere?.radius ?? 50;
  const camera = new THREE.PerspectiveCamera(32, 1, r / 100, r * 100);
  camera.position.set(r * 1.6, r * 1.2, r * 2);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  // la rotella e il pinch scorrono la pagina (niente zoom); il trascinamento in orizzontale ruota
  // il modello, quello in verticale su touch scorre la pagina (OrbitControls metterebbe touch-action: none)
  controls.enableZoom = false;
  renderer.domElement.style.touchAction = "pan-y";
  let frame = 0;
  const draw = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const moving = controls.update();
      renderer.render(scene, camera);
      if (moving) draw();
    });
  };
  const resize = () => {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    draw();
  };
  controls.addEventListener("change", draw);
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();
  return () => {
    cancelAnimationFrame(frame);
    ro.disconnect();
    controls.dispose();
    geo.dispose();
    (mesh.material as THREE.Material).dispose();
    env.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  };
}

/** Miniatura PNG del pezzo (sfondo trasparente), per le card del catalogo. */
export async function renderThumbnail(spec: PartSpec, width = 480, height = 320): Promise<string> {
  const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = env.texture;
  const light = new THREE.DirectionalLight(0xffffff, 1.3);
  light.position.set(1, 2, 1.5);
  scene.add(light);
  const info = buildPart(spec);
  scene.add(info.group);
  const s = new THREE.Box3().setFromObject(info.group).getBoundingSphere(new THREE.Sphere());
  const camera = new THREE.PerspectiveCamera(30, width / height, 1, 100000);
  const dist = (s.radius / Math.sin(THREE.MathUtils.degToRad(15))) * 0.78;
  camera.position.copy(s.center.clone().addScaledVector(new V3(0.62, 0.46, 0.72).normalize(), dist));
  camera.lookAt(s.center);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL("image/png");
  disposeGroup(info.group);
  env.dispose();
  pmrem.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  return url;
}

/** Triangoli del pezzo (per i test del limite). */
export function triangleCount(spec: PartSpec): number {
  const info = buildPart(spec);
  disposeGroup(info.group);
  return info.triangles;
}
