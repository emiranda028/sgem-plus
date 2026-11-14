import { useMemo, useState } from 'react'
import { BarChart3, Building2, ShieldCheck, Stethoscope, Wrench } from 'lucide-react'
import { Page } from '../components/Layout'
import { Kpi } from '../components/ui'
import { useStore } from '../lib/store'
import { vigencia } from '../lib/format'
import { exportCsv } from '../lib/share'

type Row = {
  id: number; nombre: string; corto: string; color: string
  equipos: number; enTaller: number; vencidos: number; abiertas: number
  certPct: number | null; prevPct: number | null
}


const METRICAS = [
  { key: 'certPct', label: '% Certificación vigente', suffix: '%' },
  { key: 'prevPct', label: '% Preventivo al día', suffix: '%' },
  { key: 'vencidos', label: 'Vencimientos vencidos', suffix: '' },
  { key: 'equipos', label: 'Equipos', suffix: '' },
] as const

export default function Comparativa() {
  const { db, clientesVisibles, setCliente } = useStore()
  const [metric, setMetric] = useState<(typeof METRICAS)[number]['key']>('certPct')

  const rows: Row[] = useMemo(() => clientesVisibles.map((c) => {
    const eqs = db.equipos.filter((e) => e.clienteId === c.id && e.estado !== 'BAJA')
    const ids = new Set(eqs.map((e) => e.id))
    const certs = db.certificaciones.filter((x) => ids.has(x.equipoId))
    const mps = db.mantenimientos.filter((x) => ids.has(x.equipoId))
    const certVig = certs.filter((x) => vigencia(x.vencimientoISO) === 'VIGENTE').length
    const prevVig = mps.filter((x) => vigencia(x.proximoISO) === 'VIGENTE').length
    const vencidos = certs.filter((x) => vigencia(x.vencimientoISO) === 'VENCIDO').length + mps.filter((x) => vigencia(x.proximoISO) === 'VENCIDO').length
    return {
      id: c.id, nombre: c.nombre, corto: c.corto, color: c.color,
      equipos: eqs.length, enTaller: eqs.filter((e) => e.estado === 'EN TALLER').length,
      vencidos, abiertas: db.ordenes.filter((o) => o.clienteId === c.id && o.situacion !== 'Cerrada').length,
      certPct: certs.length ? Math.round((certVig / certs.length) * 100) : null,
      prevPct: mps.length ? Math.round((prevVig / mps.length) * 100) : null,
    }
  }), [db, clientesVisibles])

  const tot = rows.reduce((a, r) => ({ equipos: a.equipos + r.equipos, enTaller: a.enTaller + r.enTaller, vencidos: a.vencidos + r.vencidos, abiertas: a.abiertas + r.abiertas }), { equipos: 0, enTaller: 0, vencidos: 0, abiertas: 0 })
  const certGlobal = (() => {
    const all = db.certificaciones.filter((x) => rows.some((r) => db.equipos.some((e) => e.id === x.equipoId && e.clienteId === r.id && e.estado !== 'BAJA')))
    return all.length ? Math.round(all.filter((x) => vigencia(x.vencimientoISO) === 'VIGENTE').length / all.length * 100) : 0
  })()

  const orden = useMemo(() => [...rows].sort((a, b) => (Number(b[metric] ?? -1)) - (Number(a[metric] ?? -1))), [rows, metric])
  const maxEq = Math.max(1, ...rows.map((r) => r.equipos))
  const maxVen = Math.max(1, ...rows.map((r) => r.vencidos))
  const tono = (v: number | null) => (v == null ? 'na' : v >= 80 ? 'ok' : v >= 50 ? 'warn' : 'danger')

  const download = () => exportCsv('comparativa-clientes.csv', rows.map((r) => ({
    Cliente: r.nombre, Equipos: r.equipos, CertificacionVigentePct: r.certPct ?? '', PreventivoAlDiaPct: r.prevPct ?? '', Vencidos: r.vencidos, EnTaller: r.enTaller, OrdenesAbiertas: r.abiertas,
  })))

  return (
    <Page title="Comparativa de clientes" sub={`${rows.length} clientes · lado a lado`}
      actions={<button className="btn secondary" onClick={download} disabled={!rows.length}><BarChart3 size={16} /> Exportar</button>}>
      <div className="kpi-row">
        <Kpi label="Clientes" value={rows.length} tone="brand" icon={<Building2 size={18} />} />
        <Kpi label="Equipos totales" value={tot.equipos} tone="info" icon={<Stethoscope size={18} />} hint={`${tot.enTaller} en taller`} />
        <Kpi label="Certificación vigente (global)" value={`${certGlobal}%`} tone={certGlobal >= 80 ? 'ok' : certGlobal >= 50 ? 'warn' : 'danger'} icon={<ShieldCheck size={18} />} />
        <Kpi label="Vencimientos vencidos" value={tot.vencidos} tone={tot.vencidos ? 'danger' : 'ok'} icon={<Wrench size={18} />} hint={`${tot.abiertas} órdenes abiertas`} />
      </div>

      <section className="cp">
        <div className="cp-top">
          <span>Tabla de posiciones · ordenar por</span>
          <div className="seg">
            {METRICAS.map((m) => <button key={m.key} className={metric === m.key ? 'on' : ''} onClick={() => setMetric(m.key)}>{m.label.replace('% ', '').replace(' vigente', '').replace(' al día', '').replace('Vencimientos vencidos', 'Vencidos')}</button>)}
          </div>
        </div>
        <div className="cp-head"><span /><span>Cliente</span><span>Certificación</span><span>Preventivo</span><span>Vencidos</span><span>Equipos</span><span>Taller</span><span>OS</span></div>
        {orden.map((r, i) => (
          <button key={r.id} className="cp-row" onClick={() => setCliente(db.clientes.find((c) => c.id === r.id) ?? null)}>
            <em>{String(i + 1).padStart(2, '0')}</em>
            <div className="cp-cli"><span style={{ background: r.color }}>{r.corto.slice(0, 3)}</span><b>{r.nombre}</b></div>
            {([['Certificación', r.certPct, 'certPct'], ['Preventivo', r.prevPct, 'prevPct']] as const).map(([lbl, v, k]) => (
              <div key={k} className={`cp-m ${tono(v)} ${metric === k ? 'act' : ''}`} data-l={lbl}>
                <b>{v == null ? '—' : v}{v != null && <small>%</small>}</b>
                <i><u style={{ width: `${v ?? 0}%` }} /></i>
              </div>
            ))}
            <div className={`cp-m ${r.vencidos ? 'danger' : 'ok'} ${metric === 'vencidos' ? 'act' : ''}`} data-l="Vencidos"><b>{r.vencidos}</b><i className="plain"><u style={{ width: `${(r.vencidos / maxVen) * 100}%` }} /></i></div>
            <div className={`cp-m ink ${metric === 'equipos' ? 'act' : ''}`} data-l="Equipos"><b>{r.equipos}</b><i className="plain"><u style={{ width: `${(r.equipos / maxEq) * 100}%` }} /></i></div>
            <div className="cp-n" data-l="Taller"><b>{r.enTaller}</b></div>
            <div className="cp-n" data-l="OS"><b>{r.abiertas}</b></div>
          </button>
        ))}
        <p className="tn-foot" style={{ marginTop: 12 }}>La marca en las barras de porcentaje es el objetivo de 80 %. Tocá un cliente para abrirlo.</p>
      </section>
    </Page>
  )
}
