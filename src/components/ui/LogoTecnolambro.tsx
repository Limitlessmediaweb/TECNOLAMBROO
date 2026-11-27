/**
 * Logo Tecnolambro ridisegnato in vettoriale da public/brand/logo.png: guida corrugata sullo sfondo,
 * guida rigida con le due flange in alto, la scritta TECNOLAMBRO con le «O» a forma di flangia e le due
 * righe del sottotitolo. Nitido su schermi retina; i colori seguono il tema:
 * su fondo scuro il blu si schiarisce e il testo diventa chiaro (CSS qui sotto).
 */
/** Colori e testi del logo: qui e non in globals.css, così il componente è autonomo. */
const CSS = `.tl-logo { --lg-blue: var(--logo-blue); --lg-ink: #1e2128; --lg-stripe: #c9d1d8; --lg-bg: var(--c-surface); --lg-green: #1a9440; --lg-red: #e2231a; --lg-outline: var(--logo-grey); display: block; height: auto; } :root[data-theme="dark"] .tl-logo, .intro-overlay .tl-logo { --lg-blue: #4fa8ea; --lg-ink: #e8eef3; --lg-stripe: #34485a; --lg-green: #4cc777; --lg-red: #ff6b5e; --lg-outline: #b9c6d2; } .tl-logo-stripes rect { fill: var(--lg-stripe); } .tl-logo-blue { fill: var(--lg-blue); } .tl-logo-flange rect, .tl-logo-flange > circle:not(.tl-logo-bolt) { fill: var(--lg-bg); stroke: var(--lg-blue); stroke-width: 4; } .tl-logo-bolt { fill: var(--lg-blue); } .tl-logo-letter { font-family: var(--font-display); font-size: 60px; font-weight: 900; fill: var(--lg-blue); stroke: var(--lg-ink); stroke-width: 1.2px; paint-order: stroke; } .tl-logo-line1 { font-family: var(--font-display); font-size: 14px; font-weight: 800; fill: var(--lg-ink); } .tl-logo-line2 { font-family: var(--font-display); font-size: 24px; font-weight: 800; } .tl-logo-green { fill: var(--lg-green); } .tl-logo-red { fill: var(--lg-red); } .tl-logo-outline { fill: var(--lg-bg); stroke: var(--lg-outline); stroke-width: 1px; }`;

const LETTERS = ["T", "E", "C", "N", "O", "L", "A", "M", "B", "R", "O"];
const X0 = 76;
const STEP = 38.8;

function Flange({ x, y, size }: { x: number; y: number; size: number }) {
  const h = size / 2;
  const b = size * 0.27;
  return (
    <g className="tl-logo-flange">
      <rect x={x - h} y={y - h} width={size} height={size} rx={size * 0.08} />
      <circle cx={x} cy={y} r={size * 0.2} />
      {[
        [-b, -b],
        [b, -b],
        [-b, b],
        [b, b],
      ].map(([dx, dy]) => (
        <circle key={`${dx}${dy}`} className="tl-logo-bolt" cx={x + dx * 1.35} cy={y + dy * 1.35} r={size * 0.045} />
      ))}
    </g>
  );
}

export function LogoTecnolambro({ title, className }: { title: string; className?: string }) {
  return (
    <svg viewBox="0 0 540 190" role="img" aria-label={title} className={["tl-logo", className].filter(Boolean).join(" ")}>
      <title>{title}</title>
      <style>{CSS}</style>
      {/* guida flessibile corrugata */}
      <g className="tl-logo-stripes">
        {Array.from({ length: 31 }, (_, i) => (
          <rect key={i} x={20 + i * 16.2} y={22} width={9} height={96} rx={4.5} />
        ))}
      </g>
      {/* guida rigida con le flange alle estremità */}
      <rect className="tl-logo-blue" x={44} y={30} width={452} height={11} />
      <Flange x={30} y={36} size={34} />
      <Flange x={510} y={36} size={34} />
      {/* TECNOLAMBRO, le O sono flange */}
      {LETTERS.map((l, i) => {
        const cx = X0 + i * STEP;
        return l === "O" ? (
          <Flange key={i} x={cx} y={83} size={40} />
        ) : (
          <text key={i} x={cx} y={105} textAnchor="middle" className="tl-logo-letter">
            {l}
          </text>
        );
      })}
      <text x={18} y={138} textLength={504} lengthAdjust="spacingAndGlyphs" className="tl-logo-line1">
        MANUFACTURER OF TWISTABLE FLEXIBLE AND SEAMLESS FLEXIBLE WAVEGUIDE
      </text>
      <rect className="tl-logo-blue" x={18} y={145} width={504} height={3} />
      <text x={18} y={172} textLength={504} lengthAdjust="spacingAndGlyphs" className="tl-logo-line2">
        <tspan className="tl-logo-green">components </tspan>
        <tspan className="tl-logo-outline">for microwave </tspan>
        <tspan className="tl-logo-red">applications</tspan>
      </text>
      <rect className="tl-logo-blue" x={18} y={180} width={504} height={3} />
    </svg>
  );
}
