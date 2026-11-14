import { Box } from 'lucide-react'
import EquipoArt, { tieneArt } from './EquipoArt'
import { diasHasta, fecha } from '../lib/format'
import type { Equipo, EstadoEquipo } from '../lib/types'

const ESTADOS: { k: EstadoEquipo; txt: string; cls: string }[] = [
  { k: 'OPERATIVO', txt: 'Operativos', cls: 'ok' },
  { k: 'EN TALLER', txt: 'En taller', cls: 'warn' },
  { k: 'FUERA DE SERVICIO', txt: 'Fuera de servicio', cls: 'danger' },
  { k: 'BAJA', txt: 'Baja', cls: 'off' },
]

/** Composición del parque por estado: una sola barra proporcional con su lectura. */
export function ParqueBar({ equipos, estado, onEstado }: { equipos: Equipo[]; estado?: string; onEstado?: (e: string) => void }) {
  const total = equipos.length || 1
  const filas = ESTADOS.map((s) => ({ ...s, n: equipos.filter((e) => e.estado === s.k).length })).filter((s) => s.n)
  return (
    <section className="pq" aria-label="Composición del parque por estado">
      <div className="pq-bar">
        {filas.map((s) => <span key={s.k} className={`pq-seg ${s.cls} ${estado && estado !== s.k ? 'dim' : ''}`} style={{ flexGrow: s.n }} />)}
      </div>
      <div className="pq-keys">
        {filas.map((s) => {
          const C = onEstado ? 'button' : 'div'
          return (
            <C key={s.k} className={`pq-key ${s.cls} ${estado === s.k ? 'on' : ''}`} {...(onEstado ? { type: 'button' as const, onClick: () => onEstado(estado === s.k ? '' : s.k) } : {})}>
              <b>{s.n}</b>
              <span><i />{s.txt}</span>
              <small>{Math.round((s.n / total) * 100)}%</small>
            </C>
          )
        })}
      </div>
    </section>
  )
}

/** Estante del inventario: un casillero por tipo de equipo, con su dibujo y cantidad. */
export function Estante({ equipos, tipo, onTipo }: { equipos: Equipo[]; tipo: string; onTipo: (t: string) => void }) {
  const m = new Map<string, number>()
  for (const e of equipos) m.set(e.tipo, (m.get(e.tipo) ?? 0) + 1)
  const tipos = [...m].sort((a, b) => b[1] - a[1])
  return (
    <section className="es" aria-label="Inventario por tipo de equipo">
      <div className="es-top"><span>Inventario por tipo</span><span>{tipos.length} tipos · {equipos.length} equipos</span></div>
      <div className="es-row">
        {tipos.map(([t, n]) => (
          <button key={t} type="button" className={`es-box ${tipo === t ? 'on' : ''}`} onClick={() => onTipo(tipo === t ? '' : t)}>
            <span className="es-art">{tieneArt(t) ? <EquipoArt tipo={t} size={46} /> : <Box size={26} strokeWidth={1.3} />}</span>
            <b>{String(n).padStart(2, '0')}</b>
            <small>{t}</small>
          </button>
        ))}
      </div>
    </section>
  )
}

/** Lectura de un vencimiento: días que faltan (o que lleva vencido) y la fecha. */
export function Vence({ iso }: { iso?: string | null }) {
  const d = diasHasta(iso)
  if (d == null) return <span className="vc na">No aplica</span>
  const cls = d < 0 ? 'danger' : d <= 30 ? 'warn' : 'ok'
  return (
    <span className={`vc ${cls}`}>
      <i />
      <b>{d < 0 ? `−${Math.abs(d)}` : d}<small>d</small></b>
      <span>{d < 0 ? 'vencido' : 'vence'} {fecha(iso)}</span>
    </span>
  )
}
