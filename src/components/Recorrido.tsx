import type { OrdenServicio, SituacionOS } from '../lib/types'
import { diasDesde, fecha } from '../lib/format'

const ESTACIONES = ['Abierta', 'En taller', 'Lista', 'Cerrada'] as const

/** Posición de la orden en su recorrido. Repuesto y presupuesto son detenciones en taller. */
export function etapa(s: SituacionOS): { paso: number; detenida: boolean } {
  if (s === 'Abierta') return { paso: 0, detenida: false }
  if (s === 'En taller') return { paso: 1, detenida: false }
  if (s === 'Esperando repuesto' || s === 'Presupuestar') return { paso: 1, detenida: true }
  if (s === 'Lista') return { paso: 2, detenida: false }
  return { paso: 3, detenida: false }
}

function tono(s: SituacionOS) {
  if (s === 'Cerrada' || s === 'Lista') return 'ok'
  if (s === 'Esperando repuesto') return 'danger'
  if (s === 'Presupuestar') return 'info'
  return 'warn'
}

/** Recorrido compacto para renglones: cuatro estaciones y el nombre de la actual. */
export function RecorridoMini({ situacion }: { situacion: SituacionOS }) {
  const { paso, detenida } = etapa(situacion)
  return (
    <span className={`rc-mini rc-${tono(situacion)} ${detenida ? 'hold' : ''}`} title={situacion}>
      <span className="rc-track" aria-hidden>
        {ESTACIONES.map((e, i) => <i key={e} className={i < paso ? 'done' : i === paso ? 'now' : ''} />)}
      </span>
      <span className="rc-lbl">{situacion}</span>
    </span>
  )
}

/** Recorrido completo para la ficha de la orden. */
export default function Recorrido({ orden }: { orden: OrdenServicio }) {
  const { paso, detenida } = etapa(orden.situacion)
  const cerrada = orden.situacion === 'Cerrada'
  const dias = cerrada && orden.cierreISO
    ? Math.max(0, Math.round((new Date(orden.cierreISO).getTime() - new Date(orden.aperturaISO).getTime()) / 86400000))
    : diasDesde(orden.aperturaISO) ?? 0
  return (
    <div className={`rc rc-${tono(orden.situacion)} ${detenida ? 'hold' : ''}`}>
      <div className="rc-top">
        <span>Recorrido de la orden</span>
        <span className="rc-days"><b>{dias}</b>{cerrada ? 'días de resolución' : dias === 1 ? 'día abierta' : 'días abierta'}</span>
      </div>
      <ol className="rc-line" style={{ ['--p' as string]: paso / (ESTACIONES.length - 1) }}>
        {ESTACIONES.map((e, i) => (
          <li key={e} className={i < paso ? 'done' : i === paso ? 'now' : ''}>
            <i />
            <b>{e}</b>
            <small>{i === 0 ? fecha(orden.aperturaISO) : i === 3 && orden.cierreISO ? fecha(orden.cierreISO) : i === paso ? 'ahora' : ' '}</small>
          </li>
        ))}
      </ol>
      {detenida && <div className="rc-hold"><i />Detenida en taller · {orden.situacion === 'Presupuestar' ? 'falta presupuestar' : 'esperando repuesto'}</div>}
    </div>
  )
}
