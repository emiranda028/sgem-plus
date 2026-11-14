import { useMemo, useState } from 'react'
import { Search, Wrench } from 'lucide-react'
import { Page } from '../components/Layout'
import RequireCliente from '../components/RequireCliente'
import { EmptyState, Kpi } from '../components/ui'
import EquipoArt, { tieneArt } from '../components/EquipoArt'
import { SelectBox, SelectToggle, SelectionBar, useSelection } from '../components/Selection'
import { useStore } from '../lib/store'
import { exportCsv, shareSelectionImage } from '../lib/share'
import { diasDesde, fecha, normalize } from '../lib/format'

const UMBRAL_1 = 30, UMBRAL_2 = 100

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

  const criticos = rows.filter((r) => r.dias > UMBRAL_2).length
  const prom = rows.length ? Math.round(rows.reduce((a, r) => a + r.dias, 0) / rows.length) : 0
  // Escala común: todas las barras comparten el mismo eje de días.
  const escala = Math.max(120, Math.ceil(Math.max(0, ...all.map((r) => r.dias)) / 20) * 20)
  const pct = (d: number) => `${Math.min(100, (d / escala) * 100)}%`
  const zona = (d: number) => (d > UMBRAL_2 ? 'danger' : d > UMBRAL_1 ? 'warn' : 'ok')

  return (
    <Page title="Equipos en taller" sub={cliente?.nombre}
      actions={<SelectToggle on={selection.on} onToggle={() => (selection.on ? selection.exit() : selection.setOn(true))} />}>
      {all.length > 0 && (
        <div className="card pad"><label className="search"><Search size={16} /><input placeholder="Buscar equipo, servicio o situación…" value={q} onChange={(e) => setQ(e.target.value)} /></label></div>
      )}
      <div className="kpi-row kpi-3">
        <Kpi label="En taller" value={rows.length} tone="info" icon={<Wrench size={18} />} />
        <Kpi label={`Más de ${UMBRAL_2} días`} value={criticos} tone={criticos ? 'danger' : 'neutral'} />
        <Kpi label="Promedio de días" value={prom} tone="warn" />
      </div>
      {rows.length === 0 ? <div className="card"><EmptyState icon={<Wrench size={22} />}>No hay equipos en taller.</EmptyState></div> : (
        <section className="bn" style={{ ['--t1' as string]: pct(UMBRAL_1), ['--t2' as string]: pct(UMBRAL_2) }}>
          <div className="bn-top">
            <span>Banco de trabajo · permanencia en días</span>
            <span className="bn-axis" aria-hidden><i style={{ left: 0 }}>0</i><i style={{ left: 'var(--t1)' }}>{UMBRAL_1}</i><i style={{ left: 'var(--t2)' }}>{UMBRAL_2}</i><i style={{ left: '100%' }}>{escala}</i></span>
          </div>
          {rows.map((r) => {
            const z = zona(r.dias)
            const on = selection.has(r.e.id)
            return (
              <div key={r.e.id} className={`bn-row z-${z} ${selection.on ? 'selectable' : ''} ${on ? 'selected' : ''}`} onClick={selection.on ? () => selection.toggle(r.e.id) : undefined}>
                <span className="bn-art">{selection.on ? <SelectBox checked={on} /> : tieneArt(r.e.tipo) ? <EquipoArt tipo={r.e.tipo} size={44} /> : <Wrench size={20} />}</span>
                <div className="bn-id">
                  <b>{r.e.tipo}</b>
                  <small>{r.e.fabricante} {r.e.modelo} · {r.e.serie}</small>
                  <small className="bn-meta">{r.serv} · ingreso {fecha(r.ingreso)}</small>
                </div>
                <div className="bn-plot">
                  <span className="bn-state"><i />{r.situacion}</span>
                  <span className="bn-track"><span className="bn-bar" style={{ width: pct(r.dias) }} /></span>
                </div>
                <div className="bn-days"><b>{r.dias}</b><small>días</small></div>
              </div>
            )
          })}
        </section>
      )}
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
