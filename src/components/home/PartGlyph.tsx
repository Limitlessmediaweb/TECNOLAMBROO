import type { PartType } from "@/data/configurator/types";

/**
 * Disegni al tratto delle famiglie per le card della home (vista laterale schematica, non in scala).
 * Tutti nello stesso riquadro 160×80 con le flange come rettangoli alti alle estremità.
 */
const F = (x: number, y = 40) => <rect x={x - 3} y={y - 15} width={6} height={30} rx={1} />;
const Fv = (x: number, y: number) => <rect x={x - 15} y={y - 3} width={30} height={6} rx={1} />;

const SHAPES: Partial<Record<PartType, React.ReactNode>> = {
  straight: (
    <>
      <path d="M22 32h116M22 48h116" />
      {F(22)}
      {F(138)}
    </>
  ),
  twistable: (
    <>
      <path d="M24 40c8-10 12 10 20 0s12 10 20 0 12 10 20 0 12 10 20 0 12 10 20 0 8 6 12 0" />
      <path d="M24 31c8-10 12 10 20 0s12 10 20 0 12 10 20 0 12 10 20 0 12 10 20 0 8 6 12 0" opacity="0.45" />
      <path d="M24 49c8-10 12 10 20 0s12 10 20 0 12 10 20 0 12 10 20 0 12 10 20 0 8 6 12 0" opacity="0.45" />
      {F(20)}
      {F(140)}
    </>
  ),
  seamless: (
    <>
      <path d="M22 46c30 0 40-18 58-18s30 18 58 18" />
      <path d="M22 34c30 0 40-18 58-18s30 18 58 18" opacity="0.55" />
      <path d="M22 58c30 0 40-18 58-18s30 18 58 18" opacity="0.55" />
      {F(20, 46)}
      {F(140, 46)}
    </>
  ),
  bend: (
    <>
      <path d="M26 30h50a32 32 0 0 1 32 32v8" />
      <path d="M26 46h50a16 16 0 0 1 16 16v8" />
      {F(26, 38)}
      {Fv(100, 72)}
    </>
  ),
  twist: (
    <>
      <path d="M24 32h28l56 16h28M24 48h28l56-16h28" />
      <path d="M52 32v16M108 32v16" opacity="0.5" />
      <path d="M66 36l28 8M66 44l28-8" opacity="0.35" />
      {F(22)}
      {F(138)}
    </>
  ),
  offset: (
    <>
      <path d="M22 22h34c24 0 24 28 48 28h34" />
      <path d="M22 36h34c24 0 24 28 48 28h34" />
      {F(22, 29)}
      {F(138, 57)}
    </>
  ),
  transition: (
    <>
      <path d="M22 30h40l36-8h40M22 50h40l36 8h40" />
      <path d="M62 30v20M98 22v36" opacity="0.5" />
      {F(22)}
      <rect x={135} y={18} width={6} height={44} rx={1} />
    </>
  ),
  termination: (
    <>
      <path d="M26 32h88l20 8-20 8H26" />
      <path d="M70 40h44" opacity="0.45" strokeDasharray="3 4" />
      {F(24)}
    </>
  ),
  pressure: (
    <>
      <path d="M22 32h116M22 48h116" />
      <path d="M74 32V18h12v14M70 18h20" />
      {F(22)}
      {F(138)}
    </>
  ),
  spacer: (
    <>
      <rect x={72} y={22} width={16} height={36} rx={1.5} />
      <path d="M56 40h-30M104 40h30" opacity="0.45" strokeDasharray="3 4" />
      <rect x={78} y={34} width={4} height={12} opacity="0.6" />
    </>
  ),
};

export function PartGlyph({ type }: { type: PartType }) {
  return (
    <svg viewBox="0 0 160 80" className="hx-glyph" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        {SHAPES[type] ?? SHAPES.straight}
      </g>
    </svg>
  );
}
