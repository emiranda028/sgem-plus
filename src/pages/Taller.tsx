import { useMemo, useState } from 'react'
import { Search, Wrench } from 'lucide-react'
import { Page } from '../components/Layout'
import RequireCliente from '../components/RequireCliente'
import { Badge, EmptyState, Kpi } from '../components/ui'
import { SelectBox, SelectToggle, SelectionBar, useSelection } from '../components/Selection'
import { useStore } from '../lib/store'
import { exportCsv, shareSelectionImage } from '../lib/share'
import { diasDesde, fecha, normalize } from '../lib/format'

function Taller({ clienteId }: { clienteId: number }) {
  const { db, cliente } = useStore()
  const [q, setQ] = useState('')
  const selection = useSelection()
  const all = useMemo(() => {
    const equipos = db.equipos.filter((e) => e.clienteId === clienteId && e.estado === 'EN TALLER')
    return equipos.map((e) => {
      const os = db.ordenes.filter((o) => o.equipoId === e.id && o.situacion !== 'Cerrada').sort((a, b) => a.aperturaISO.localeCompare(b.aperturaISO))[0]
      const ingreso = os?.aperturaISO ?? e.altaISO
      const serv = db.servicios.find((s) => s.id === e.servicioId)?.nombre ?? ''
      return { e, ingreso, dias: diasDesde(ingreso) ?? 0, situacion: os?.situacion ?? 'En taller', serv }
    }).sort((a, b) => b.dias - a.dias)
  }, [db, clienteId])
  const rows = useMemo(() => {
    const n = normalize(q)
    return n ? all.filter((r) => normalize(`${r.e.tipo} ${r.e.fabricante} ${r.e.modelo} ${r.e.serie} ${r.serv} ${r.situacion}`).includes(n)) : all
  }, [all, q])

  const criticos = rows.filter((r) => r.dias > 100).length
  const prom = rows.length ? Math.round(rows.reduce((a, r) => a + r.dias, 0) / rows.length) : 0

  return (
    <Page title="Equipos en taller" sub={cliente?.nombre}
      actions={<SelectToggle on={selection.on} onToggle={() => (selection.on ? selection.exit() : selection.setOn(true))} />}>
      {all.length > 0 && (
        <div className="card pad"><label className="search"><Search size={16} /><input placeholder="Buscar equipo, servicio o situación…" value={q} onChange={(e) => setQ(e.target.value)} /></label></div>
      )}
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
                  <tr key={r.e.id} className={`${selection.on ? 'selectable' : ''} ${selection.has(r.e.id) ? 'selected' : ''}`} onClick={selection.on ? () => selection.toggle(r.e.id) : undefined}>
                    <td data-label="Equipo"><div className="sel-head">{selection.on && <SelectBox checked={selection.has(r.e.id)} />}<div><div className="row-strong">{r.e.tipo}</div><div className="faint small">{r.e.fabricante} {r.e.modelo} · {r.e.serie}</div></div></div></td>
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
      {selection.on && (
        <SelectionBar count={selection.size} total={rows.length}
          onAll={() => selection.selectMany(rows.map((r) => r.e.id))}
          onClear={selection.clear}
          onCsv={() => exportCsv('taller-seleccion.csv', rows.filter((r) => selection.has(r.e.id)).map((r) => ({ Equipo: r.e.tipo, Fabricante: r.e.fabricante, Modelo: r.e.modelo, Serie: r.e.serie, Servicio: r.serv, Situacion: r.situacion, Ingreso: fecha(r.ingreso), DiasEnTaller: r.dias })))}
          onImg={() => shareSelectionImage({ title: 'Equipos en taller', subtitle: cliente?.nombre, filename: 'taller-sgem.png', items: rows.filter((r) => selection.has(r.e.id)).map((r) => ({ titulo: `${r.e.tipo} · ${r.e.fabricante} ${r.e.modelo}`, lineas: [`S/N ${r.e.serie} · ${r.serv}`, `${r.situacion} · ${r.dias} días en taller`, `Ingreso ${fecha(r.ingreso)}`] })) })}
        />
      )}
    </Page>
  )
}

export default function TallerPage() {
  return <RequireCliente>{(id) => <Taller clienteId={id} />}</RequireCliente>
}
