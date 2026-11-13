import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, eachDayOfInterval, format, isSameDay, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { Page } from '../components/Layout'
import RequireCliente from '../components/RequireCliente'
import { Badge, EmptyState, IconTile, iconOS, useIsMobile } from '../components/ui'
import { useStore } from '../lib/store'
import { NOW } from '../lib/format'
import type { OrdenServicio } from '../lib/types'

const COLORS = ['#0b7a90', '#4f46e5', '#10893e', '#bf7408', '#db2777', '#2563eb']

function Agenda({ clienteId }: { clienteId: number }) {
  const { db, cliente } = useStore()
  const nav = useNavigate()
  const [cursor, setCursor] = useState(() => startOfWeek(NOW, { weekStartsOn: 1 }))
  const [tecFiltro, setTecFiltro] = useState('')

  const programadas = useMemo(
    () => db.ordenes.filter((o) => o.clienteId === clienteId && o.programadaISO),
    [db.ordenes, clienteId],
  )
  const tecnicos = useMemo(() => [...new Set(programadas.map((o) => o.tecnico))].sort(), [programadas])
  const colorDe = (t: string) => COLORS[Math.max(0, tecnicos.indexOf(t)) % COLORS.length]
  const dias = useMemo(() => eachDayOfInterval({ start: cursor, end: addDays(cursor, 6) }), [cursor])
  const isMobile = useIsMobile()
  const delDia = (d: Date) => programadas.filter((o) => o.programadaISO && isSameDay(new Date(o.programadaISO), d) && (!tecFiltro || o.tecnico === tecFiltro))

  return (
    <Page title="Agenda de técnicos" sub={`${cliente?.nombre} · visitas programadas`}
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="sel" value={tecFiltro} onChange={(e) => setTecFiltro(e.target.value)}>
            <option value="">Todos los técnicos</option>
            {tecnicos.map((t) => <option key={t}>{t}</option>)}
          </select>
          <div className="seg">
            <button onClick={() => setCursor((c) => addDays(c, -7))}><ChevronLeft size={16} /></button>
            <button onClick={() => setCursor(startOfWeek(NOW, { weekStartsOn: 1 }))}>Hoy</button>
            <button onClick={() => setCursor((c) => addDays(c, 7))}><ChevronRight size={16} /></button>
          </div>
        </div>
      }>
      {tecnicos.length > 0 && (
        <div className="card pad" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="faint small">Técnicos:</span>
          {tecnicos.map((t) => <span key={t} className="chip" style={{ borderColor: colorDe(t) }}><span style={{ width: 8, height: 8, borderRadius: 2, background: colorDe(t), display: 'inline-block' }} /> {t}</span>)}
        </div>
      )}
      {isMobile ? (
        <div className="stagger" style={{ display: 'grid', gap: 10 }}>
          {dias.map((d) => {
            const items = delDia(d)
            const hoy = isSameDay(d, NOW)
            if (items.length === 0 && !hoy) return null
            return (
              <div key={d.toISOString()} className={`ag-day ${hoy ? 'today' : ''}`}>
                <div className="ag-h">
                  <span className="d-num">{format(d, 'd')}</span>
                  <span className="d-dow">{format(d, 'EEEE', { locale: es })}</span>
                  <span className="d-count"><Badge tone={items.length ? 'brand' : 'neutral'}>{items.length} visita{items.length === 1 ? '' : 's'}</Badge></span>
                </div>
                {items.length > 0 && (
                  <div className="ag-body">
                    {items.map((o: OrdenServicio) => (
                      <button key={o.id} className="ag-item" style={{ borderLeftColor: colorDe(o.tecnico) }} onClick={() => nav('/ordenes')}>
                        <IconTile icon={iconOS(o.tipo)} tone="brand" size={34} />
                        <div className="ai-body"><div className="ai-t">{o.titulo}</div><div className="ai-s">{o.tecnico} · {o.taller}</div></div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(150px, 1fr))', gap: 10, overflowX: 'auto' }}>
        {dias.map((d) => {
          const items = delDia(d)
          const hoy = isSameDay(d, NOW)
          return (
            <div key={d.toISOString()} className="card" style={{ background: hoy ? 'var(--brand-soft)' : 'var(--surface-2)', borderColor: hoy ? 'var(--brand)' : undefined, minHeight: 160 }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                <div className="faint small" style={{ textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600 }}>{format(d, 'EEE', { locale: es })}</div>
                <div style={{ fontFamily: 'var(--ff-d)', fontWeight: 800, fontSize: 18, color: hoy ? 'var(--brand)' : undefined }}>{format(d, 'd')}</div>
              </div>
              <div style={{ padding: 8, display: 'grid', gap: 6 }}>
                {items.map((o: OrdenServicio) => (
                  <button key={o.id} onClick={() => nav('/ordenes')} style={{ textAlign: 'left', background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${colorDe(o.tecnico)}`, borderRadius: 'var(--radius)', padding: '7px 9px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.titulo}</div>
                    <div className="faint" style={{ fontSize: 11 }}>{o.tecnico}</div>
                  </button>
                ))}
                {items.length === 0 && <div className="faint" style={{ fontSize: 11, padding: 4 }}>—</div>}
              </div>
            </div>
          )
        })}
      </div>
      )}
      {programadas.length === 0 && (
        <div className="card"><EmptyState icon={<CalendarDays size={22} />}>No hay visitas programadas. Programá una desde el detalle de una orden.</EmptyState></div>
      )}
      <div className="faint small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Badge tone="brand">Tip</Badge> Programá fecha y técnico en el detalle de cada orden de servicio.</div>
    </Page>
  )
}

export default function AgendaPage() {
  return <RequireCliente>{(id) => <Agenda clienteId={id} />}</RequireCliente>
}
