/* Ilustraciones lineales propias por tipo de equipo. Cada trazo se dibuja solo
   al aparecer (stroke-dashoffset), en vez de usar un ícono de librería. */

const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`
const ci = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`

const ART: Record<string, string[]> = {
  monitor: [
    rr(14, 20, 92, 62, 8), 'M24 54h14l5-14 7 26 6-18 4 6h20',
    rr(86, 30, 12, 9, 2), rr(86, 44, 12, 9, 2), rr(86, 58, 12, 9, 2),
    'M60 82v14', 'M40 98h40',
  ],
  desfibrilador: [
    rr(16, 36, 88, 56, 10), 'M44 36v-8a6 6 0 0 1 6-6h20a6 6 0 0 1 6 6v8',
    rr(26, 46, 42, 26, 4), 'M31 60h8l4-9 5 16 4-7h11',
    'M90 46l-9 15h8l-6 15', ci(34, 82, 3.5), ci(48, 82, 3.5), 'M62 82h12',
  ],
  ventilador: [
    rr(30, 12, 60, 40, 6), 'M38 36c6-12 10 8 16-4s10 8 16-2 8 2 12 0',
    'M52 52v30', 'M68 52v30', rr(40, 82, 40, 12, 3),
    'M44 94v6', 'M76 94v6', ci(44, 104, 4), ci(76, 104, 4),
    'M90 30c14 0 16 16 8 26s-2 22-10 22',
  ],
  bomba: [
    'M28 12v92', 'M18 104h20', 'M28 16h22', rr(44, 16, 22, 30, 5), 'M55 46v10',
    rr(40, 56, 58, 36, 6), rr(47, 63, 26, 14, 2), ci(84, 66, 3), ci(84, 78, 3), 'M47 84h26',
    'M98 80c10 0 10 20 0 24',
  ],
  incubadora: [
    'M22 62V46a16 16 0 0 1 16-16h44a16 16 0 0 1 16 16v16z', ci(46, 48, 7), ci(74, 48, 7),
    rr(18, 62, 84, 12, 3), 'M32 74v22', 'M88 74v22', 'M32 86h56', ci(32, 100, 4), ci(88, 100, 4),
  ],
  arco: [
    'M84 22a40 40 0 1 0 0 76', rr(78, 14, 24, 12, 3), rr(78, 94, 24, 12, 3),
    'M56 60h58', 'M44 60H30', rr(14, 40, 16, 64, 4), 'M10 106h36', ci(16, 111, 3.5), ci(38, 111, 3.5),
  ],
  electrobisturi: [
    rr(18, 40, 84, 44, 8), ci(40, 62, 9), 'M40 55v7', ci(66, 62, 9), 'M66 62l5-5',
    rr(84, 52, 10, 20, 2), 'M30 84v8', 'M90 84v8', 'M92 40c0-18 14-22 14-6', 'M106 34l4 14',
  ],
  ecografo: [
    rr(34, 10, 52, 36, 5), 'M44 38c8-18 24-18 32 0', 'M60 46v10', rr(24, 56, 72, 16, 4),
    'M32 64h20', 'M60 64h4', 'M70 64h4', 'M80 64h4', 'M40 72v22', 'M80 72v22', ci(40, 100, 4), ci(80, 100, 4),
    'M96 62c12 0 14 12 8 22',
  ],
}

const MAPA: [RegExp, keyof typeof ART][] = [
  [/desfibril|cardiodes/i, 'desfibrilador'],
  [/monitor|electrocardi/i, 'monitor'],
  [/ventilador|respirador|anestesia/i, 'ventilador'],
  [/bomba/i, 'bomba'],
  [/incubadora|cuna|neonat/i, 'incubadora'],
  [/arco en c|rayos|radiolog|tomograf/i, 'arco'],
  [/electrobistur/i, 'electrobisturi'],
  [/ecograf|ultrason|doppler/i, 'ecografo'],
]

export function tieneArt(tipo: string) {
  return MAPA.some(([re]) => re.test(tipo))
}

export default function EquipoArt({ tipo, size = 64, className = '' }: { tipo: string; size?: number; className?: string }) {
  const key = MAPA.find(([re]) => re.test(tipo))?.[1]
  if (!key) return null
  return (
    <svg className={`eq-art ${className}`} viewBox="0 0 120 120" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ART[key].map((d, i) => <path key={i} d={d} pathLength={1} style={{ animationDelay: `${0.08 + i * 0.07}s` }} />)}
    </svg>
  )
}
