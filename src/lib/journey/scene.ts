/**
 * «Il viaggio del segnale»: la scena three.js della home.
 * Una sola scena: catena di pezzi WR-90 (guida rigida, curva, twist, flessibile) con le flange
 * avvitate, il campo elettrico del modo TE10 che avanza e la camera su un binario guidato dallo scroll.
 * Tutto generato in codice (nessun modello, HDRI o texture da scaricare).
 * Caricata con import() dinamico da components/journey/SignalJourney.tsx.
 */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { A, B, WALL, FL, L, S, P, LAMBDA_G, CORR_AMP, CORR_PITCH, frameAt, newFrame, sOfP, flexOfP, sstep, smoother, lerp, clamp01, type Frame } from "./path";

export type JourneyScene = {
  /** Fotogramma del viaggio: p = avanzamento dello scroll (0..1), t = secondi */
  render: (p: number, t: number) => void;
  /** Vista ferma di un pannello (prefers-reduced-motion): il pezzo ruota piano, la camera non vola */
  renderCalm: (panel: number, t: number) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
};

const UP = new THREE.Vector3(0, 1, 0);
const v3 = (a: readonly number[], out = new THREE.Vector3()) => out.set(a[0], a[1], a[2]);

/* ------------------------------------------------------------------ profili e superfici */

type Profile = { x: number[]; y: number[]; nx: number[]; ny: number[]; u: number[] };

/** Rettangolo con gli spigoli raccordati, percorso in senso antiorario. Le normali sono continue. */
function roundedRect(hx: number, hy: number, r: number, n: number): Profile {
  const out: Profile = { x: [], y: [], nx: [], ny: [], u: [] };
  const centers: [number, number][] = [
    [hx - r, hy - r],
    [-hx + r, hy - r],
    [-hx + r, -hy + r],
    [hx - r, -hy + r],
  ];
  let len = 0;
  for (let c = 0; c < 4; c++) {
    for (let i = 0; i <= n; i++) {
      const a = (c + i / n) * (Math.PI / 2);
      const x = centers[c][0] + Math.cos(a) * r;
      const y = centers[c][1] + Math.sin(a) * r;
      const k = out.x.length;
      if (k) len += Math.hypot(x - out.x[k - 1], y - out.y[k - 1]);
      out.x.push(x);
      out.y.push(y);
      out.nx.push(Math.cos(a));
      out.ny.push(Math.sin(a));
      out.u.push(len);
    }
  }
  const k = out.x.length;
  len += Math.hypot(out.x[0] - out.x[k - 1], out.y[0] - out.y[k - 1]);
  out.x.push(out.x[0]);
  out.y.push(out.y[0]);
  out.nx.push(out.nx[0]);
  out.ny.push(out.ny[0]);
  out.u.push(len);
  return out;
}

type SweepSpec = {
  profile: Profile;
  s0: number;
  s1: number;
  step: (s: number) => number;
  inward?: boolean;
  /** Scostamento radiale del profilo (corrugazioni): [d, d'] all'ascissa s */
  offset?: (s: number) => [number, number];
};

type Sweep = { mesh: THREE.Mesh; update: (flex: number) => void };

/** Profilo trascinato lungo il percorso. update(flex) ricalcola posizioni e normali. */
function makeSweep(spec: SweepSpec, material: THREE.Material): Sweep {
  const rings: number[] = [];
  for (let s = spec.s0; s < spec.s1 - 1e-4; s += spec.step(s)) rings.push(s);
  rings.push(spec.s1);
  const { profile } = spec;
  const m = profile.x.length;
  const n = rings.length;
  const pos = new Float32Array(n * m * 3);
  const nor = new Float32Array(n * m * 3);
  const uv = new Float32Array(n * m * 2);
  const idx: number[] = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++) {
      uv[(i * m + j) * 2] = profile.u[j] / 34;
      uv[(i * m + j) * 2 + 1] = rings[i] / 34;
    }
  for (let i = 0; i < n - 1; i++)
    for (let j = 0; j < m - 1; j++) {
      const a = i * m + j;
      const b = a + 1;
      const c = a + m;
      const d = c + 1;
      if (spec.inward) idx.push(a, c, b, b, c, d);
      else idx.push(a, b, c, b, d, c);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const f = newFrame();
  const sign = spec.inward ? -1 : 1;
  const update = (flex: number) => {
    for (let i = 0; i < n; i++) {
      const s = rings[i];
      frameAt(s, flex, f);
      const [d, dd] = spec.offset ? spec.offset(s) : [0, 0];
      for (let j = 0; j < m; j++) {
        const k = (i * m + j) * 3;
        const x = profile.x[j] + profile.nx[j] * d;
        const y = profile.y[j] + profile.ny[j] * d;
        pos[k] = f.p[0] + f.l[0] * x + f.u[0] * y;
        pos[k + 1] = f.p[1] + f.l[1] * x + f.u[1] * y;
        pos[k + 2] = f.p[2] + f.l[2] * x + f.u[2] * y;
        let ax = f.l[0] * profile.nx[j] + f.u[0] * profile.ny[j] - f.t[0] * dd;
        let ay = f.l[1] * profile.nx[j] + f.u[1] * profile.ny[j] - f.t[1] * dd;
        let az = f.l[2] * profile.nx[j] + f.u[2] * profile.ny[j] - f.t[2] * dd;
        const q = sign / Math.hypot(ax, ay, az);
        ax *= q;
        ay *= q;
        az *= q;
        nor[k] = ax;
        nor[k + 1] = ay;
        nor[k + 2] = az;
      }
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.normal.needsUpdate = true;
    geo.computeBoundingSphere();
  };
  update(0);
  const mesh = new THREE.Mesh(geo, material);
  return { mesh, update };
}

/** Texture leggera di metallo spazzolato, disegnata su canvas */
function brushed(seed: number): THREE.CanvasTexture {
  let r = seed;
  const rnd = () => {
    r = (r * 1664525 + 1013904223) >>> 0;
    return r / 4294967296;
  };
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#cfcfcf";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1500; i++) {
    const x = rnd() * 256;
    const y = rnd() * 256;
    const h = 30 + rnd() * 200;
    g.fillStyle = `rgba(${rnd() < 0.5 ? "255,255,255" : "0,0,0"},${0.025 + rnd() * 0.07})`;
    g.fillRect(x, y, 0.6 + rnd(), h);
    g.fillRect(x, y - 256, 0.6 + rnd(), h);
  }
  for (let i = 0; i < 7; i++) {
    g.fillStyle = `rgba(0,0,0,${0.04 + rnd() * 0.07})`;
    g.fillRect(0, rnd() * 256, 256, 0.8 + rnd() * 1.4);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Studio fotografico in codice: softbox chiari su fondo scuro, per riflessi veri sul metallo */
function studioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x212d38);
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const box = (w: number, h: number, color: number, gain: number, at: [number, number, number]) => {
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    mat.color.multiplyScalar(gain);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...at);
    mesh.lookAt(0, 0, 0);
    s.add(mesh);
    geos.push(geo);
    mats.push(mat);
  };
  box(10, 6, 0xffffff, 8, [0, 8, 1]); // softbox grande dall'alto
  box(7, 6, 0xe4f1ff, 4.2, [-7, 2.5, 6]); // bank freddo davanti a sinistra
  box(4, 7, 0xffe9d2, 5, [8, 2, 2]); // bank caldo a destra
  box(12, 0.8, 0x8fc6f5, 6, [0, 1, -9]); // linea d'orizzonte dietro
  box(1.2, 8, 0xffffff, 9, [-3, 3, -8]); // controluce stretto
  box(14, 14, 0x1b2c3a, 1, [0, -7, 0]); // rimbalzo del pavimento
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(s, 0.03).texture;
  pmrem.dispose();
  geos.forEach((g) => g.dispose());
  mats.forEach((m) => m.dispose());
  return tex;
}

/* -------------------------------------------------------------------------- la scena */

const FLANGE = 41.4;
const HOLES: [number, number][] = [
  [15.5, 16.25],
  [-15.5, 16.25],
  [-15.5, -16.25],
  [15.5, -16.25],
];

function flangeGeometry(): THREE.ExtrudeGeometry {
  const h = FLANGE / 2;
  const r = 2.2;
  const f = new THREE.Shape();
  f.moveTo(-h + r, -h);
  f.lineTo(h - r, -h);
  f.quadraticCurveTo(h, -h, h, -h + r);
  f.lineTo(h, h - r);
  f.quadraticCurveTo(h, h, h - r, h);
  f.lineTo(-h + r, h);
  f.quadraticCurveTo(-h, h, -h, h - r);
  f.lineTo(-h, -h + r);
  f.quadraticCurveTo(-h, -h, -h + r, -h);
  const a = A / 2 + 0.12;
  const b = B / 2 + 0.12;
  const bore = new THREE.Path();
  bore.moveTo(-a, -b);
  bore.lineTo(-a, b);
  bore.lineTo(a, b);
  bore.lineTo(a, -b);
  bore.closePath();
  f.holes.push(bore);
  for (const [x, y] of HOLES) {
    const c = new THREE.Path();
    c.absarc(x, y, 2.15, 0, Math.PI * 2, true);
    f.holes.push(c);
  }
  const bevel = 0.4;
  return new THREE.ExtrudeGeometry(f, { depth: FL - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 2, curveSegments: 18 }).translate(0, 0, bevel);
}

export function createJourneyScene(canvas: HTMLCanvasElement, opts: { compact: boolean }): JourneyScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  const maxRatio = opts.compact ? 1.5 : 1.75;
  let ratio = Math.min(window.devicePixelRatio || 1, maxRatio);
  renderer.setPixelRatio(ratio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.3, 14000);
  scene.environment = studioEnvironment(renderer);

  /* Fondale: blu-grafite profondo con una fascia d'orizzonte più chiara, come un limbo da studio */
  const backdrop = new THREE.Mesh(
    new THREE.SphereGeometry(6000, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        varying vec3 vDir;
        void main(){
          float h = vDir.y;
          vec3 top = vec3(0.010, 0.019, 0.030);
          vec3 bottom = vec3(0.006, 0.011, 0.018);
          vec3 band = vec3(0.036, 0.068, 0.104);
          float m = exp(-pow((h + 0.04) * 3.0, 2.0));
          vec3 c = mix(h > 0.0 ? top : bottom, band, m);
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  );
  backdrop.frustumCulled = false;
  backdrop.renderOrder = -10;
  scene.add(backdrop);

  /* Materiali: rame, argento, ottone dorato, acciaio della viteria */
  const texA = brushed(7);
  texA.colorSpace = THREE.SRGBColorSpace;
  const texB = brushed(19);
  const copper = new THREE.MeshStandardMaterial({ color: 0xe09a68, metalness: 1, roughness: 0.36, map: texA, roughnessMap: texB });
  const silver = new THREE.MeshStandardMaterial({ color: 0xe9edf0, metalness: 1, roughness: 0.33, map: texA, roughnessMap: texB });
  const silverEdge = new THREE.MeshStandardMaterial({ color: 0xaab3bb, metalness: 1, roughness: 0.42 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9ac5c, metalness: 1, roughness: 0.27 });
  const collar = new THREE.MeshStandardMaterial({ color: 0xcfa257, metalness: 1, roughness: 0.34, roughnessMap: texB, side: THREE.DoubleSide });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9fa8b0, metalness: 1, roughness: 0.36 });
  const innerSilver = new THREE.MeshStandardMaterial({ color: 0xe6edf3, metalness: 0.84, roughness: 0.32, roughnessMap: texB, envMapIntensity: 0.1 });
  const innerGold = new THREE.MeshStandardMaterial({ color: 0xf0cf8e, metalness: 0.84, roughness: 0.32, envMapIntensity: 0.1 });

  const chain = new THREE.Group();
  /** Pezzi dopo la prima guida: nascosti nell'apertura, quando si vede solo il pezzo protagonista */
  const rest = new THREE.Group();
  scene.add(chain);
  chain.add(rest);

  const stepStatic = (s: number) => {
    if (s >= S.arc0 - 2 && s < S.arc1 + 2) return 1.6;
    if (s >= S.tw0 - 2 && s < S.tw1 + 2) return 1.1;
    return 4;
  };
  const stepFlex = (s: number) => (s >= S.cor0 && s < S.cor1 ? CORR_PITCH / 9 : 1.5);
  /** Corrugazione: onda lungo la flessibile, raccordata agli estremi */
  const corr = (s: number): [number, number] => {
    if (s <= S.cor0 || s >= S.cor1) return [0, 0];
    const w = sstep(S.cor0, S.cor0 + 3, s) * (1 - sstep(S.cor1 - 3, S.cor1, s));
    const a = ((s - S.cor0) / CORR_PITCH) * Math.PI * 2;
    return [CORR_AMP * w * (0.5 - 0.5 * Math.cos(a)), ((CORR_AMP * w * Math.PI) / CORR_PITCH) * Math.sin(a)];
  };

  const profInner = roundedRect(A / 2, B / 2, 0.5, 3);
  const profOuter = roundedRect(A / 2 + WALL, B / 2 + WALL, 1.0, 4);
  const profFlexOut = roundedRect(A / 2 + 0.55, B / 2 + 0.55, 1.6, 5);
  const profFlexIn = roundedRect(A / 2, B / 2, 1.2, 4);
  const profCollar = roundedRect(A / 2 + 2.6, B / 2 + 2.6, 1.4, 4);

  const dynamic: Sweep[] = [];
  const addSweep = (spec: SweepSpec, mat: THREE.Material, parent: THREE.Object3D, isDynamic = false) => {
    const sw = makeSweep(spec, mat);
    parent.add(sw.mesh);
    if (isDynamic) {
      sw.mesh.frustumCulled = false;
      dynamic.push(sw);
    }
  };

  // interno: continuo lungo tutta la catena (argentato), corrugato e dorato nella flessibile
  addSweep({ profile: profInner, s0: 0, s1: S.rigid1 + 0.5, step: stepStatic, inward: true }, innerSilver, chain);
  addSweep({ profile: profInner, s0: S.rigid1 + 0.5, s1: S.cor0, step: stepStatic, inward: true }, innerSilver, rest);
  addSweep({ profile: profFlexIn, s0: S.cor0, s1: L, step: stepFlex, inward: true, offset: corr }, innerGold, rest, true);
  // esterno
  addSweep({ profile: profOuter, s0: FL - 0.3, s1: S.rigid1 - FL + 0.3, step: stepStatic }, copper, chain);
  addSweep({ profile: profOuter, s0: S.rigid1 + FL - 0.3, s1: S.bend1 - FL + 0.3, step: stepStatic }, copper, rest);
  addSweep({ profile: profOuter, s0: S.bend1 + FL - 0.3, s1: S.twist1 - FL + 0.3, step: stepStatic }, copper, rest);
  addSweep({ profile: profCollar, s0: S.twist1 + FL - 0.3, s1: S.cor0 + 1.5, step: () => 3 }, collar, rest);
  addSweep({ profile: profFlexOut, s0: S.cor0, s1: S.cor1, step: stepFlex, offset: corr }, gold, rest, true);
  addSweep({ profile: profCollar, s0: S.cor1 - 1.5, s1: L - FL + 0.3, step: () => 3 }, collar, rest, true);

  // flange
  const flangeGeo = flangeGeometry();
  const fr = newFrame();
  const basis = new THREE.Matrix4();
  const placeFlange = (mesh: THREE.Mesh, s0: number, flex: number) => {
    frameAt(s0, flex, fr);
    mesh.matrix.makeBasis(v3(fr.l), v3(fr.u), v3(fr.t)).setPosition(v3(fr.p));
    mesh.matrixWorldNeedsUpdate = true;
  };
  const addFlange = (s0: number, parent: THREE.Object3D) => {
    const mesh = new THREE.Mesh(flangeGeo, [silver, silverEdge]);
    mesh.matrixAutoUpdate = false;
    placeFlange(mesh, s0, 0);
    parent.add(mesh);
    return mesh;
  };
  addFlange(0, chain);
  addFlange(S.rigid1 - FL, chain);
  for (const s0 of [S.rigid1, S.bend1 - FL, S.bend1, S.twist1 - FL, S.twist1]) addFlange(s0, rest);
  const endFlange = addFlange(L - FL, rest);
  endFlange.frustumCulled = false;

  // viteria delle giunzioni: testa esagonale da un lato, dado dall'altro
  const JOINTS = [S.rigid1, S.bend1, S.twist1];
  const boltGeo = new THREE.CylinderGeometry(3.4, 3.4, 2.6, 6);
  const bolts = new THREE.InstancedMesh(boltGeo, steel, JOINTS.length * 8);
  {
    let k = 0;
    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    for (const sj of JOINTS) {
      frameAt(sj, 0, fr);
      const l = v3(fr.l);
      const u = v3(fr.u);
      const t = v3(fr.t);
      basis.makeBasis(l, t, u.clone().negate());
      for (const [x, y] of HOLES)
        for (const side of [-1, 1]) {
          pos.copy(v3(fr.p)).addScaledVector(l, x).addScaledVector(u, y).addScaledVector(t, side * (FL + 1.3));
          m.copy(basis).setPosition(pos);
          bolts.setMatrixAt(k++, m);
        }
    }
    bolts.instanceMatrix.needsUpdate = true;
  }
  rest.add(bolts);

  /* Campo elettrico TE10: linee tra le pareti larghe, intensità ∝ sin(πx/a)·cos(βz − ωt) */
  const NX = 9;
  const DS = LAMBDA_G / 12;
  const SLICES = Math.floor((L - 2) / DS);
  const COUNT = SLICES * NX;
  const iPos = new Float32Array(COUNT * 3);
  const iSu = new Float32Array(COUNT * 3);
  const iUS = new Float32Array(COUNT * 2);
  const fieldGeo = new THREE.InstancedBufferGeometry();
  // corpo della linea (quadrilatero) + punta di freccia (triangolo)
  fieldGeo.setAttribute("position", new THREE.Float32BufferAttribute([-0.5, -1, 0, 0.5, -1, 0, 0.5, 1, 0, -0.5, -1, 0, 0.5, 1, 0, -0.5, 1, 0, -1, 0, 0, 1, 0, 0, 0, 1, 0], 3));
  fieldGeo.setAttribute("aKind", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 1, 1, 1], 1));
  const aPos = new THREE.InstancedBufferAttribute(iPos, 3);
  const aSu = new THREE.InstancedBufferAttribute(iSu, 3);
  fieldGeo.setAttribute("iPos", aPos);
  fieldGeo.setAttribute("iSu", aSu);
  fieldGeo.setAttribute("iUS", new THREE.InstancedBufferAttribute(iUS, 2));
  fieldGeo.instanceCount = COUNT;
  const placeField = (flex: number) => {
    let k = 0;
    for (let i = 0; i < SLICES; i++) {
      const s = 1.5 + i * DS;
      frameAt(s, flex, fr);
      for (let j = 0; j < NX; j++) {
        const u = (j + 1) / (NX + 1);
        const x = (u - 0.5) * A;
        iPos[k * 3] = fr.p[0] + fr.l[0] * x;
        iPos[k * 3 + 1] = fr.p[1] + fr.l[1] * x;
        iPos[k * 3 + 2] = fr.p[2] + fr.l[2] * x;
        iSu[k * 3] = fr.u[0];
        iSu[k * 3 + 1] = fr.u[1];
        iSu[k * 3 + 2] = fr.u[2];
        iUS[k * 2] = u;
        iUS[k * 2 + 1] = s;
        k++;
      }
    }
    aPos.needsUpdate = true;
    aSu.needsUpdate = true;
  };
  placeField(0);
  const fieldMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uT: { value: 0 },
      uK: { value: (Math.PI * 2) / LAMBDA_G },
      uHead: { value: -30 },
      uNear: { value: 6 },
      uReach: { value: 170 },
      uHalf: { value: B * 0.47 },
      uW: { value: 0.3 },
      uGain: { value: 1 },
      uBlue: { value: new THREE.Color(0x0a78d6) },
      uIce: { value: new THREE.Color(0xa9dcff) },
    },
    vertexShader: `
      attribute vec3 iPos; attribute vec3 iSu; attribute vec2 iUS; attribute float aKind;
      uniform float uT, uK, uHead, uNear, uReach, uHalf, uW;
      varying float vE; varying float vX; varying float vKind;
      void main(){
        float dist = distance(cameraPosition, iPos);
        float e = sin(3.14159265 * iUS.x) * cos(uK * iUS.y - uT);
        float ae = abs(e);
        float env = smoothstep(uHead + uNear, uHead + uNear + 16.0, iUS.y) * (1.0 - smoothstep(uHead + uReach * 0.5, uHead + uReach, iUS.y));
        float dir = e >= 0.0 ? 1.0 : -1.0;
        vec3 side = normalize(cross(iSu, cameraPosition - iPos));
        float w = uW * (0.35 + 0.65 * ae) * max(1.0, dist / 55.0);
        // lunghezza della freccia ∝ profilo sin(πx/a): massima al centro, corta verso le pareti strette
        float reach = uHalf * (0.16 + 0.84 * sin(3.14159265 * iUS.x));
        vec3 p;
        if (aKind < 0.5) {
          p = iPos + iSu * (position.y * reach) + side * (position.x * w);
        } else {
          float hl = 1.9 * (0.4 + 0.6 * ae);
          p = iPos + iSu * dir * (reach - hl * (1.0 - position.y)) + side * (position.x * w * 2.8);
        }
        vE = ae * env * smoothstep(5.0, 26.0, dist); vX = position.x; vKind = aKind;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uBlue, uIce; uniform float uGain;
      varying float vE; varying float vX; varying float vKind;
      void main(){
        float soft = vKind < 0.5 ? 1.0 - smoothstep(0.12, 0.5, abs(vX)) : 1.0;
        float a = vE * soft * 0.9;
        vec3 c = mix(uBlue, uIce, vE * vE * 0.8) * (0.5 + 1.9 * vE) * uGain;
        gl_FragColor = vec4(c, a);
      }`,
  });
  const field = new THREE.Mesh(fieldGeo, fieldMat);
  field.frustumCulled = false;
  field.renderOrder = 3;
  chain.add(field);

  /* Impulso blu all'ingresso: profilo del TE10 (massimo al centro) che pulsa nel foro della flangia */
  const pulseMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uAmount: { value: 1 }, uBlue: { value: new THREE.Color(0x0a78d6) }, uIce: { value: new THREE.Color(0xa9dcff) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uT, uAmount; uniform vec3 uBlue, uIce; varying vec2 vUv;
      void main(){
        float prof = sin(3.14159265 * vUv.x);
        float beat = pow(0.5 + 0.5 * sin(uT * 2.4), 2.0);
        float edge = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
        float e = prof * (0.25 + 0.75 * beat) * mix(0.75, 1.0, edge);
        vec3 c = mix(uBlue, uIce, e * e) * (0.5 + 2.6 * e);
        gl_FragColor = vec4(c, e * uAmount);
      }`,
  });
  const pulse = new THREE.Mesh(new THREE.PlaneGeometry(A, B), pulseMat);
  pulse.position.set(0, 0, -1.2);
  pulse.renderOrder = 2;
  chain.add(pulse);

  /* Luci: chiave e controluce da studio, bagliore blu del segnale, lampada di camera dentro la guida */
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(140, 240, 260);
  const rim = new THREE.DirectionalLight(0x6fbaf0, 1.3);
  rim.position.set(-220, 70, -200);
  const glow = new THREE.PointLight(0x2f9bff, 0, 0, 2);
  const lamp = new THREE.PointLight(0xfff0e2, 0, 0, 2);
  scene.add(key, rim, glow, lamp);

  /* Bloom leggero sul segnale e sui riflessi più forti */
  const target = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: opts.compact ? 2 : 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), 0.36, 0.6, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* Ingombro della catena a flessibile piegata: centro e raggio per l'inquadratura larga */
  const center = new THREE.Vector3();
  let radius = 1;
  {
    const box = new THREE.Box3();
    const q = new THREE.Vector3();
    for (let s = 0; s <= L; s += 6) box.expandByPoint(v3(frameAt(s, 1, fr).p, q));
    box.getCenter(center);
    radius = box.getSize(q).length() / 2 + FLANGE * 0.5;
  }

  let width = 1;
  let height = 1;
  let aspect = 1;
  let portrait = false;
  let dHero = 200;
  let dWide = 600;
  let fovIn = 74;
  const FOV_OUT = 32;
  const FOV_WIDE = 34;
  const halfAngle = (fov: number) => {
    const v = THREE.MathUtils.degToRad(fov / 2);
    return Math.min(v, Math.atan(Math.tan(v) * aspect));
  };

  function resize(w: number, h: number) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    aspect = width / height;
    portrait = aspect < 0.8;
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(ratio);
    composer.setSize(width, height);
    camera.aspect = aspect;
    const tv = Math.tan(THREE.MathUtils.degToRad(FOV_OUT / 2));
    dHero = Math.max(FLANGE / (0.38 * 2 * tv), FLANGE / (0.4 * 2 * tv * aspect));
    dWide = (radius * (portrait ? 1.12 : 1.14)) / Math.sin(halfAngle(FOV_WIDE));
    fovIn = portrait ? 94 : 74;
  }

  let lastFlex = -1;
  function setFlex(flex: number) {
    if (Math.abs(flex - lastFlex) < 1e-4) return;
    lastFlex = flex;
    for (const sw of dynamic) sw.update(flex);
    placeFlange(endFlange, L - FL, flex);
    placeField(flex);
  }

  const cPos = new THREE.Vector3();
  const cAim = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const f0 = newFrame();
  const f1: Frame = newFrame();
  let spin = 0;
  let lastT = 0;

  function applyCamera(fov: number, shiftX: number, shiftY: number) {
    camera.position.copy(cPos);
    camera.up.copy(UP);
    camera.lookAt(cAim);
    camera.fov = fov;
    if (Math.abs(shiftX) > 1e-4 || Math.abs(shiftY) > 1e-4) camera.setViewOffset(width, height, -shiftX * width, shiftY * height, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    backdrop.position.copy(cPos);
  }

  /** Posizione sull'orbita attorno a un centro */
  const orbit = (c: THREE.Vector3, dist: number, az: number, el: number, out: THREE.Vector3) =>
    out.set(c.x + dist * Math.cos(el) * Math.sin(az), c.y + dist * Math.sin(el), c.z + dist * Math.cos(el) * Math.cos(az));

  const GLOW_IN = 105;
  const LAMP_IN = 8;
  let slow = 0;
  let frames = 0;
  let stamp = 0;
  /** Se il portatile fatica, si abbassa la risoluzione (mai sotto 1): fluidità prima della nitidezza */
  function watchdog() {
    const now = performance.now();
    if (stamp) {
      const dt = now - stamp;
      if (dt < 250) {
        slow += dt;
        frames++;
      }
      if (frames >= 50) {
        if (slow / frames > 30 && ratio > 1) {
          ratio = Math.max(1, ratio - 0.25);
          resize(width, height);
        }
        slow = 0;
        frames = 0;
      }
    }
    stamp = now;
  }

  function render(p: number, t: number) {
    const dt = Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    const flex = flexOfP(p);
    setFlex(flex);

    let fov = FOV_OUT;
    let head = -30;
    let inside = 0;
    let shiftX = 0;
    let shiftY = 0;
    let pulseAmount = 0;
    let showRest = true;

    if (p < P.enter) {
      // 1 · il pezzo nel buio da studio, poi l'ingresso nel foro della flangia
      const u = p / P.enter;
      const x = clamp01((u - 0.42) / 0.58);
      const slope = Math.min(2, ((S.rigid1 / (P.rigid - P.enter)) * 0.58 * P.enter) / dHero);
      const e = clamp01(3 * x * x - 2 * x * x * x + slope * (x * x * x - x * x));
      const w = 1 - smoother(x);
      const yaw = (0.8 + 0.07 * Math.sin(t * 0.31)) * w;
      const z = dHero * (1 - e);
      cPos.set(Math.sin(yaw) * z, (portrait ? 20 : 15) * w * (1 - e), Math.cos(yaw) * z);
      cAim.set(0, 0, -10 - 6 * e - 20 * w);
      fov = lerp(FOV_OUT, fovIn, sstep(0.55, 1, x));
      shiftX = (portrait ? 0 : 0.17) * w;
      shiftY = (portrait ? 0.3 : 0.02) * w;
      pulseAmount = 1 - sstep(0.75, 0.98, x);
      inside = sstep(0.6, 1, x);
      showRest = z < 26;
      head = -30 + 30 * sstep(0.5, 1, x);
    } else if (p <= P.exit) {
      // 2-6 · dentro: la camera segue il segnale lungo il binario
      const s = sOfP(p);
      frameAt(s, flex, f0);
      frameAt(s + 16, flex, f1);
      v3(f0.p, cPos);
      v3(f1.p, cAim);
      fov = fovIn;
      head = s;
      inside = 1;
    } else {
      // 6-7 · uscita dall'ultima flangia e catena intera che ruota
      const u = clamp01((p - P.exit) / (P.wide - P.exit));
      const e = clamp01((u * u * u - 2 * u * u + u) * 0.34 + (3 * u * u - 2 * u * u * u));
      spin += dt * 0.13;
      frameAt(L, flex, f0);
      const end = v3(f0.p, tmp);
      const dir = v3(f0.t, tmp2);
      const mid = end.clone().addScaledVector(dir, 150);
      mid.y += 34;
      const az0 = Math.atan2(mid.x - center.x, mid.z - center.z);
      const az = az0 + spin + 1.5 * sstep(P.exit, 1, p);
      const wide = orbit(center, dWide, az, portrait ? 0.5 : 0.4, new THREE.Vector3());
      const k = 1 - e;
      cPos.set(k * k * end.x + 2 * k * e * mid.x + e * e * wide.x, k * k * end.y + 2 * k * e * mid.y + e * e * wide.y, k * k * end.z + 2 * k * e * mid.z + e * e * wide.z);
      const ahead = end.clone().addScaledVector(dir, 70 + 220 * u);
      cAim.copy(ahead).lerp(center, sstep(0.04, 0.62, u));
      fov = lerp(fovIn, FOV_WIDE, sstep(0, 0.5, u));
      const settle = sstep(0.35, 1, u);
      shiftX = (portrait ? 0 : 0.24) * settle;
      shiftY = (portrait ? 0.2 : 0.03) * settle;
      head = L - 150;
      inside = 1 - sstep(0, 0.25, u);
    }

    rest.visible = showRest;
    applyCamera(fov, shiftX, shiftY);

    fieldMat.uniforms.uT.value = t * 5.4;
    fieldMat.uniforms.uHead.value = head;
    fieldMat.uniforms.uNear.value = lerp(-4, 7, inside);
    const inTwist = sstep(S.bend1 - 20, S.tw0 + 6, head) * (1 - sstep(S.tw1 + 4, S.twist1 + 24, head));
    fieldMat.uniforms.uGain.value = lerp(1.25, 1, inside) * (1 + 0.7 * inTwist);
    pulseMat.uniforms.uT.value = t;
    pulseMat.uniforms.uAmount.value = pulseAmount;
    pulse.visible = pulseAmount > 0.01;

    const beat = 0.5 + 0.5 * Math.sin(t * 2.4);
    if (p < P.enter) {
      glow.position.set(0, 0, 9 - 24 * inside);
      glow.intensity = (90 + 200 * beat * beat) * (1 - inside) + GLOW_IN * inside;
    } else {
      frameAt(Math.min(L, head + 34), flex, f1);
      v3(f1.p, glow.position);
      glow.intensity = GLOW_IN * Math.max(inside, 0.12) * (1 - 0.45 * inTwist);
    }
    // dentro la guida la luce da studio non arriva: restano il bagliore del segnale e la lampada di camera
    key.intensity = 1.5 * (1 - inside);
    rim.intensity = 1.3 * (1 - inside);
    scene.environmentIntensity = lerp(1, 0.35, inside);
    lamp.position.copy(cPos);
    lamp.intensity = LAMP_IN * inside * sstep(P.enter - 0.01, P.enter + 0.03, p) * (1 - 0.55 * inTwist);

    composer.render();
    watchdog();
  }

  /* Viste ferme (prefers-reduced-motion): centro e raggio per ogni pannello */
  const calmFocus = (panel: number): [THREE.Vector3, number] => {
    const at = (s: number) => v3(frameAt(s, 1, fr).p, new THREE.Vector3());
    if (panel === 1) return [at(0), 36];
    if (panel === 0 || panel === 2) return [at(50), 62];
    if (panel === 3) return [at((S.arc0 + S.arc1) / 2), 66];
    if (panel === 4) return [at((S.bend1 + S.twist1) / 2), 62];
    if (panel === 5) return [at((S.twist1 + L) / 2), 86];
    return [center, radius];
  };

  function renderCalm(panel: number, t: number) {
    setFlex(1);
    rest.visible = true;
    key.intensity = 1.5;
    rim.intensity = 1.3;
    scene.environmentIntensity = 1;
    const [c, r] = calmFocus(panel);
    const dist = (r * (panel >= 6 && !portrait ? 1.3 : 1.08)) / Math.sin(halfAngle(FOV_OUT));
    orbit(c, dist, 0.7 + t * 0.07, 0.36, cPos);
    cAim.copy(c);
    applyCamera(FOV_OUT, portrait ? 0 : panel >= 6 ? 0.24 : 0.16, portrait ? 0.18 : 0);
    fieldMat.uniforms.uT.value = 0;
    fieldMat.uniforms.uHead.value = -30;
    fieldMat.uniforms.uNear.value = -4;
    pulseMat.uniforms.uT.value = 0.65;
    pulseMat.uniforms.uAmount.value = 1;
    pulse.visible = true;
    glow.position.set(0, 0, 9);
    glow.intensity = 200;
    lamp.intensity = 0;
    composer.render();
  }

  function dispose() {
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose?.();
      const mat = mesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose?.();
    });
    texA.dispose();
    texB.dispose();
    scene.environment?.dispose();
    target.dispose();
    composer.dispose();
    renderer.dispose();
  }

  return { render, renderCalm, resize, dispose };
}
