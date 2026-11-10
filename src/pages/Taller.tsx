import { useMemo } from 'react'
import { Wrench } from 'lucide-react'
import { Page } from '../components/Layout'
import RequireCliente from '../components/RequireCliente'
import { Badge, EmptyState, Kpi } from '../components/ui'
import { useStore } from '../lib/store'
import { diasDesde, fecha } from '../lib/format'

function Taller({ clienteId }: { clienteId: number }) {
  const { db, cliente } = useStore()
  const rows = useMemo(() => {
    const equipos = db.equipos.filter((e) => e.clienteId === clienteId && e.estado === 'EN TALLER')
    return equipos.map((e) => {
      const os = db.ordenes.filter((o) => o.equipoId === e.id && o.situacion !== 'Cerrada').sort((a, b) => a.aperturaISO.localeCompare(b.aperturaISO))[0]
      const ingreso = os?.aperturaISO ?? e.altaISO
      const serv = db.servicios.find((s) => s.id === e.servicioId)?.nombre ?? ''
      return { e, ingreso, dias: diasDesde(ingreso) ?? 0, situacion: os?.situacion ?? 'En taller', serv }
    }).sort((a, b) => b.dias - a.dias)
  }, [db, clienteId])

  const criticos = rows.filter((r) => r.dias > 100).length
  const prom = rows.length ? Math.round(rows.reduce((a, r) => a + r.dias, 0) / rows.length) : 0

  return (
    <Page title="Equipos en taller" sub={cliente?.nombre}>
      <div className="kpi-row kpi-3">
        <Kpi label="En taller" value={rows.length} tone="info" icon={<Wrench size={18} />} />
        <Kpi label="Más de 100 días" value={criticos} tone={criticos ? 'danger' : 'neutral'} />
        <Kpi label="Promedio de días" value={prom} tone="warn" />
      </div>
      <div className="card">
        {rows.length === 0 ? <EmptyState icon={<Wrench size={22} />}>No hay equipos en taller.</EmptyState> : (
          <div className="tbl-wrap">
            <table className="tbl cards">
              <thead><tr><th>Equipo</th><th>Servicio</th><th>Situación</th><th>Ingreso</th><th className="num">Días en taller</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.e.id}>
                    <td data-label="Equipo"><div className="row-strong">{r.e.tipo}</div><div className="faint small">{r.e.fabricante} {r.e.modelo} · {r.e.serie}</div></td>
                    <td data-label="Servicio">{r.serv}</td>
                    <td data-label="Situación"><Badge tone={r.situacion === 'Esperando repuesto' ? 'danger' : 'warn'}>{r.situacion}</Badge></td>
                    <td data-label="Ingreso" className="mono small">{fecha(r.ingreso)}</td>
                    <td data-label="Días en taller" className="num">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
                        <div style={{ width: 90, height: 6, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, (r.dias / 200) * 100)}%`, height: '100%', background: r.dias > 100 ? 'var(--danger)' : r.dias > 30 ? 'var(--warn)' : 'var(--ok)' }} />
                        </div>
                        <strong className="mono" style={{ color: r.dias > 100 ? 'var(--danger)' : undefined }}>{r.dias}</strong>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Page>
  )
}

export default function TallerPage() {
  return <RequireCliente>{(id) => <Taller clienteId={id} />}</RequireCliente>
}
