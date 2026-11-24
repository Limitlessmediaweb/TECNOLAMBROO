import { flangeGrooves, flangeHoles, flangeOutline, type FlangeDef } from "@/data/flanges";

/**
 * Miniatura della flangia vista dalla faccia di accoppiamento, in scala, dalle stesse quote del
 * modello 3D: contorno, fori delle viti, foro rettangolare a × b, gola o-ring e gola choke.
 */
export function FlangeIcon({ flange, a, b, className }: { flange: FlangeDef; a: number; b: number; className?: string }) {
  const { w, h } = flangeOutline(flange);
  const size = Math.max(w, h) * 1.08;
  const sw = size / 60;
  const grooves = flangeGrooves(flange, a, b);
  return (
    <svg viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} className={className} aria-hidden="true" focusable="false">
      {flange.shape === "round" ? (
        <circle r={flange.A / 2} fill="var(--c-surface-2)" stroke="var(--c-line-strong)" strokeWidth={sw} />
      ) : (
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={Math.min(w, h) * 0.07} fill="var(--c-surface-2)" stroke="var(--c-line-strong)" strokeWidth={sw} />
      )}
      {grooves.map((g, i) =>
        g.shape === "circle" ? (
          <circle key={i} r={g.at} fill="none" stroke={g.gasket ? "var(--c-fg)" : "var(--c-primary)"} strokeWidth={g.width} opacity={g.gasket ? 0.8 : 0.55} />
        ) : (
          <rect key={i} x={-a / 2 - g.at} y={-b / 2 - g.at} width={a + 2 * g.at} height={b + 2 * g.at} rx={g.at * 0.9} fill="none" stroke="var(--c-fg)" strokeWidth={g.width} opacity={0.8} />
        ),
      )}
      <rect x={-a / 2} y={-b / 2} width={a} height={b} fill="var(--c-fg)" />
      {flangeHoles(flange).map(([u, v], i) => (
        <circle key={i} cx={u} cy={v} r={flange.hole / 2} fill="var(--c-bg)" stroke="var(--c-line-strong)" strokeWidth={sw * 0.8} />
      ))}
    </svg>
  );
}
