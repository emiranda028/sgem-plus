import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, eachDayOfInterval, format, getISOWeek, isSameDay, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { Page } from '../components/Layout'
import RequireCliente from '../components/RequireCliente'
import { EmptyState, useIsMobile } from '../components/ui'
import { useStore } from '../lib/store'
import { NOW, clean } from '../lib/format'
import type { OrdenServicio, TipoOS } from '../lib/types'

const SIGLA: Record<TipoOS, string> = { 'Reparación': 'REP', 'Mantenimiento preventivo': 'MP', 'Certificación': 'CERT', 'Instalación': 'INST', 'Provisión': 'PROV' }
const nombreTec = (t: string) => t.split('.').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
const iniciales = (t: string) => t.split('.').map((p) => p.charAt(0).toUpperCase()).join('').slice(0, 2)
const hora = (o: OrdenServicio) => format(new Date(o.programadaISO!), 'HH:mm')

function Agenda({ clienteId }: { clienteId: number }) {
  const { db, cliente } = useStore()
  const nav = useNavigate()
  const [cursor, setCursor] = useState(() => startOfWeek(NOW, { weekStartsOn: 1 }))
  const [tecFiltro, setTecFiltro] = useState('')
  const isMobile = useIsMobile()

  const programadas = useMemo(
    () => db.ordenes.filter((o) => o.clienteId === clienteId && o.programadaISO && o.situacion !== 'Cerrada')
      .sort((a, b) => a.programadaISO!.localeCompare(b.programadaISO!)),
    [db.ordenes, clienteId],
  )
  const tecnicos = useMemo(() => [...new Set(programadas.map((o) => o.tecnico))].sort(), [programadas])
  const dias = useMemo(() => eachDayOfInterval({ start: cursor, end: addDays(cursor, 6) }), [cursor])
  const visibles = tecFiltro ? tecnicos.filter((t) => t === tecFiltro) : tecnicos
  const deSemana = programadas.filter((o) => { const d = new Date(o.programadaISO!); return d >= cursor && d < addDays(cursor, 7) && (!tecFiltro || o.tecnico === tecFiltro) })
  const celda = (t: string | null, d: Date) => deSemana.filter((o) => (t === null || o.tecnico === t) && isSameDay(new Date(o.programadaISO!), d))
  const abrir = (o: OrdenServicio) => nav(`/ordenes?os=${o.id}`)

  const Visita = ({ o, conTec }: { o: OrdenServicio; conTec?: boolean }) => (
    <button className={`tn-v ${o.criticidad === 'ALTA' ? 'crit' : ''}`} onClick={() => abrir(o)}>
      <span className="tn-h">{hora(o)}<em>{SIGLA[o.tipo]}</em></span>
      <span className="tn-t">{clean(o.titulo).replace(/^[^:]+:\s*/, '')}</span>
      <span className="tn-s">{o.numero}{conTec ? ` · ${nombreTec(o.tecnico)}` : ''}</span>
    </button>
  )

  return (
    <Page title="Agenda de técnicos" sub={`${cliente?.nombre} · visitas programadas`}
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="sel" value={tecFiltro} onChange={(e) => setTecFiltro(e.target.value)}>
            <option value="">Todos los técnicos</option>
            {tecnicos.map((t) => <option key={t} value={t}>{nombreTec(t)}</option>)}
          </select>
          <div className="seg">
            <button onClick={() => setCursor((c) => addDays(c, -7))} aria-label="Semana anterior"><ChevronLeft size={16} /></button>
            <button onClick={() => setCursor(startOfWeek(NOW, { weekStartsOn: 1 }))}>Hoy</button>
            <button onClick={() => setCursor((c) => addDays(c, 7))} aria-label="Semana siguiente"><ChevronRight size={16} /></button>
          </div>
        </div>
      }>
      {programadas.length === 0 ? (
        <div className="card"><EmptyState icon={<CalendarDays size={22} />}>No hay visitas programadas. Programá una desde el detalle de una orden.</EmptyState></div>
      ) : (
        <section className="tn">
          <div className="tn-top">
            <span>Semana {getISOWeek(cursor)} · {format(cursor, "d 'de' MMM", { locale: es })} al {format(addDays(cursor, 6), "d 'de' MMM yyyy", { locale: es })}</span>
            <span><b>{deSemana.length}</b> visita{deSemana.length === 1 ? '' : 's'}</span>
          </div>
          {isMobile ? (
            <div className="tn-days">
              {dias.map((d) => {
                const items = celda(null, d)
                const hoy = isSameDay(d, NOW)
                if (!items.length && !hoy) return null
                return (
                  <div key={d.toISOString()} className={`tn-day ${hoy ? 'hoy' : ''}`}>
                    <div className="tn-date"><b>{format(d, 'd')}</b><small>{format(d, 'EEE', { locale: es }).replace('.', '')}</small>{hoy && <em>hoy</em>}</div>
                    <div className="tn-list">
                      {items.map((o) => <Visita key={o.id} o={o} conTec />)}
                      {!items.length && <span className="tn-none">Sin visitas</span>}
                    </div>
                  </div>
                )
              })}
              {deSemana.length === 0 && <div className="tn-none" style={{ padding: '14px 0' }}>Semana sin visitas programadas.</div>}
            </div>
          ) : (
            <div className="tn-grid">
              <div className="tn-corner">Técnico</div>
              {dias.map((d) => {
                const hoy = isSameDay(d, NOW)
                return <div key={d.toISOString()} className={`tn-dh ${hoy ? 'hoy' : ''} ${d.getDay() === 0 || d.getDay() === 6 ? 'finde' : ''}`}><small>{format(d, 'EEE', { locale: es }).replace('.', '')}</small><b>{format(d, 'd')}</b></div>
              })}
              {visibles.map((t) => {
                const n = deSemana.filter((o) => o.tecnico === t).length
                return [
                  <div key={t} className="tn-tec"><span className="tn-ini">{iniciales(t)}</span><div><b>{nombreTec(t)}</b><small>{n} visita{n === 1 ? '' : 's'}</small></div></div>,
                  ...dias.map((d) => {
                    const items = celda(t, d)
                    return (
                      <div key={t + d.toISOString()} className={`tn-cell ${isSameDay(d, NOW) ? 'hoy' : ''} ${d.getDay() === 0 || d.getDay() === 6 ? 'finde' : ''}`}>
                        {items.map((o) => <Visita key={o.id} o={o} />)}
                      </div>
                    )
                  }),
                ]
              })}
            </div>
          )}
        </section>
      )}
      <div className="tn-foot">La fecha y el técnico de cada visita se definen en el detalle de la orden de servicio.</div>
    </Page>
  )
}

export default function AgendaPage() {
  return <RequireCliente>{(id) => <Agenda clienteId={id} />}</RequireCliente>
}
