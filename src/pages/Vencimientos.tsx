import { useMemo, useState } from 'react'
import { CalendarClock, Download, ShieldCheck } from 'lucide-react'
import { Page } from '../components/Layout'
import RequireCliente from '../components/RequireCliente'
import { Badge, EmptyState, Kpi } from '../components/ui'
import { useAlertas, useStore, type Alerta } from '../lib/store'
import { diasHasta, fecha } from '../lib/format'
import { exportCsv } from '../lib/csv'

function grupo(a: Alerta): string {
  const d = diasHasta(a.vencimientoISO) ?? 0
  if (d < 0) return 'Vencidos'
  if (d <= 7) return 'Esta semana'
  if (d <= 30) return 'Este mes'
  return 'Más adelante'
}
const ORDEN = ['Vencidos', 'Esta semana', 'Este mes', 'Más adelante']

function Vencimientos({ clienteId }: { clienteId: number }) {
  const { cliente } = useStore()
  const alertas = useAlertas(clienteId)
  const [filtro, setFiltro] = useState<'Todos' | 'Certificación' | 'Mantenimiento'>('Todos')

  const rows = useMemo(() => alertas.filter((a) => filtro === 'Todos' || a.tipo === filtro), [alertas, filtro])
  const grupos = useMemo(() => {
    const m = new Map<string, Alerta[]>()
    for (const a of rows) { const g = grupo(a); (m.get(g) ?? m.set(g, []).get(g)!).push(a) }
    return ORDEN.map((g) => [g, m.get(g) ?? []] as const).filter(([, l]) => l.length)
  }, [rows])

  const vencidos = alertas.filter((a) => a.estado === 'VENCIDO').length
  const cert = alertas.filter((a) => a.tipo === 'Certificación').length
  const mp = alertas.filter((a) => a.tipo === 'Mantenimiento').length

  const download = () => exportCsv('vencimientos.csv', rows.map((a) => ({ Tipo: a.tipo, Equipo: a.equipo, Servicio: a.servicio, Vencimiento: fecha(a.vencimientoISO), Estado: a.estado })))

  return (
    <Page title="Vencimientos" sub={`${cliente?.nombre} · certificaciones y mantenimientos`}
      actions={<button className="btn secondary" onClick={download} disabled={!rows.length}><Download size={16} /> Exportar</button>}>
      <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <Kpi label="Total a atender" value={alertas.length} tone="warn" icon={<CalendarClock size={18} />} hint={`${vencidos} ya vencidos`} />
        <Kpi label="Certificaciones" value={cert} tone="info" icon={<ShieldCheck size={18} />} />
        <Kpi label="Mantenimientos" value={mp} tone="accent" icon={<CalendarClock size={18} />} />
      </div>

      <div className="card pad">
        <div className="filters">
          {(['Todos', 'Certificación', 'Mantenimiento'] as const).map((f) => (
            <button key={f} className={`chip ${filtro === f ? 'on' : ''}`} onClick={() => setFiltro(f)}>{f}</button>
          ))}
        </div>
      </div>

      {grupos.length === 0 ? <div className="card"><EmptyState icon={<ShieldCheck size={22} />}>Todo al día. Sin vencimientos próximos.</EmptyState></div> : grupos.map(([g, list]) => (
        <div className="card" key={g}>
          <div className="card-head">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`badge ${g === 'Vencidos' ? 'tone-danger' : g === 'Esta semana' ? 'tone-warn' : 'tone-info'}`}>{list.length}</span>
              {g}
            </h3>
          </div>
          <div className="tbl-wrap">
            <table className="tbl cards">
              <thead><tr><th>Tipo</th><th>Equipo</th><th>Servicio</th><th>Vence</th><th className="num">Días</th></tr></thead>
              <tbody>
                {list.map((a, i) => {
                  const d = diasHasta(a.vencimientoISO) ?? 0
                  return (
                    <tr key={i}>
                      <td data-label="Tipo"><Badge tone={a.tipo === 'Certificación' ? 'info' : 'accent'}>{a.tipo}</Badge></td>
                      <td data-label="Equipo" className="row-strong">{a.equipo}</td>
                      <td data-label="Servicio">{a.servicio}</td>
                      <td data-label="Vence" className="mono small">{fecha(a.vencimientoISO)}</td>
                      <td data-label="Días" className="num mono" style={{ color: d < 0 ? 'var(--danger)' : d <= 7 ? 'var(--warn)' : undefined, fontWeight: 600 }}>{d < 0 ? `−${Math.abs(d)}` : d}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </Page>
  )
}

export default function VencimientosPage() {
  return <RequireCliente>{(id) => <Vencimientos clienteId={id} />}</RequireCliente>
}
