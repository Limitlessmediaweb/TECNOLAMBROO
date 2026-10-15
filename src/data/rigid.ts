/**
 * Dati reali delle guide rigide (curve, twist, disassati), per misura, forniti dall'ufficio tecnico.
 * `null` = dato non ancora fornito.
 *
 * - Nelle pagine di curve, twist e disassati la tabella "Dati per misura" mostra solo le misure e le
 *   colonne con almeno un valore; se è tutto `null` la tabella non compare.
 * - Lo spessore di parete, quando c'è, sostituisce quello indicativo nel 3D e nei disegni
 *   (waveguides.ts → rigidOuter); il raggio minimo è il limite sotto cui il raggio "standard"
 *   del 3D e del disegno non scende (configurator/defaults.ts → visualBendRadius).
 *
 * Unità: millimetri. Esempio: "WR-90": { minRadiusE: 25, minRadiusH: 40, wall: 1.27 }
 */
export type RigidGeometry = {
  /** raggio minimo di curvatura, curva in piano E */
  minRadiusE: number | null;
  /** raggio minimo di curvatura, curva in piano H */
  minRadiusH: number | null;
  /** spessore di parete */
  wall: number | null;
};

const EMPTY: RigidGeometry = { minRadiusE: null, minRadiusH: null, wall: null };

export const RIGID_GEOMETRY: Readonly<Record<string, RigidGeometry>> = {
  "WR-22": { ...EMPTY },
  "WR-28": { ...EMPTY },
  "WR-34": { ...EMPTY },
  "WR-42": { ...EMPTY },
  "WR-51": { ...EMPTY },
  "WR-62": { ...EMPTY },
  "WR-75": { ...EMPTY },
  "WR-90": { ...EMPTY },
  "WR-112": { ...EMPTY },
  "WR-137": { ...EMPTY },
  "WR-159": { ...EMPTY },
  "WR-187": { ...EMPTY },
  "WR-229": { ...EMPTY },
  "WR-284": { ...EMPTY },
};

export const RIGID_COLUMNS = ["minRadiusE", "minRadiusH", "wall"] as const;
export type RigidColumn = (typeof RIGID_COLUMNS)[number];

/** Righe e colonne da mostrare: solo misure e colonne con almeno un valore. */
export function rigidTable(): { rows: { wr: string; values: RigidGeometry }[]; columns: RigidColumn[] } {
  const rows = Object.entries(RIGID_GEOMETRY)
    .filter(([, v]) => RIGID_COLUMNS.some((c) => v[c] !== null))
    .map(([wr, values]) => ({ wr, values }));
  const columns = RIGID_COLUMNS.filter((c) => rows.some((r) => r.values[c] !== null));
  return { rows, columns };
}
