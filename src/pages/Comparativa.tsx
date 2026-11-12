import { useMemo, useState } from 'react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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

const pctColor = (v: number | null) => v == null ? 'var(--text-3)' : v >= 70 ? 'var(--ok)' : v >= 40 ? 'var(--warn)' : 'var(--danger)'

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

  const chart = useMemo(() => [...rows].sort((a, b) => (Number(b[metric] ?? -1)) - (Number(a[metric] ?? -1))).map((r) => ({ name: r.corto, value: r[metric] ?? 0, isPct: metric === 'certPct' || metric === 'prevPct' })), [rows, metric])
  const activa = METRICAS.find((m) => m.key === metric)!

  const download = () => exportCsv('comparativa-clientes.csv', rows.map((r) => ({
    Cliente: r.nombre, Equipos: r.equipos, CertificacionVigentePct: r.certPct ?? '', PreventivoAlDiaPct: r.prevPct ?? '', Vencidos: r.vencidos, EnTaller: r.enTaller, OrdenesAbiertas: r.abiertas,
  })))

  return (
    <Page title="Comparativa de clientes" sub={`${rows.length} clientes · lado a lado`}
      actions={<button className="btn secondary" onClick={download} disabled={!rows.length}><BarChart3 size={16} /> Exportar</button>}>
      <div className="kpi-row">
        <Kpi label="Clientes" value={rows.length} tone="brand" icon={<Building2 size={18} />} />
        <Kpi label="Equipos totales" value={tot.equipos} tone="info" icon={<Stethoscope size={18} />} hint={`${tot.enTaller} en taller`} />
        <Kpi label="Certificación vigente (global)" value={`${certGlobal}%`} tone={certGlobal >= 70 ? 'ok' : certGlobal >= 40 ? 'warn' : 'danger'} icon={<ShieldCheck size={18} />} />
        <Kpi label="Vencimientos vencidos" value={tot.vencidos} tone={tot.vencidos ? 'danger' : 'ok'} icon={<Wrench size={18} />} hint={`${tot.abiertas} órdenes abiertas`} />
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Comparar por</h3>
          <div className="seg">
            {METRICAS.map((m) => <button key={m.key} className={metric === m.key ? 'on' : ''} onClick={() => setMetric(m.key)}>{m.label.replace('% ', '').replace(' vigente', '').replace(' al día', '')}</button>)}
          </div>
        </div>
        <div className="card-body">
          <div className="faint small" style={{ marginBottom: 10 }}>{activa.label}</div>
          <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 42)}>
            <BarChart data={chart} layout="vertical" margin={{ left: 8, right: 36, top: 4, bottom: 4 }}>
              <XAxis type="number" domain={metric === 'certPct' || metric === 'prevPct' ? [0, 100] : [0, 'dataMax']} tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={64} tick={{ fontSize: 12, fill: 'var(--text-2)' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [`${v}${activa.suffix}`, activa.label]} contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12 }} cursor={{ fill: 'var(--surface-3)' }} />
              <Bar dataKey="value" radius={[0, 5, 5, 0]} label={{ position: 'right', fontSize: 11, fill: 'var(--text-2)', formatter: (v: number) => `${v}${activa.suffix}` }}>
                {chart.map((d, i) => <Cell key={i} fill={d.isPct ? pctColor(d.value) : metric === 'vencidos' ? (d.value > 0 ? 'var(--danger)' : 'var(--ok)') : 'var(--brand)'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Detalle por cliente</h3><span className="faint small">Tocá un cliente para abrirlo</span></div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Cliente</th><th className="num">Equipos</th><th className="num">Cert.</th><th className="num">Prev.</th><th className="num">Vencidos</th><th className="num">En taller</th><th className="num">OS abiertas</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => setCliente(db.clientes.find((c) => c.id === r.id) ?? null)}>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 26, height: 26, borderRadius: 7, background: r.color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, flex: 'none', fontFamily: 'var(--ff-d)' }}>{r.corto.slice(0, 3)}</span><span className="row-strong">{r.nombre}</span></div></td>
                  <td className="num mono">{r.equipos}</td>
                  <td className="num mono" style={{ color: pctColor(r.certPct), fontWeight: 700 }}>{r.certPct == null ? '—' : `${r.certPct}%`}</td>
                  <td className="num mono" style={{ color: pctColor(r.prevPct), fontWeight: 700 }}>{r.prevPct == null ? '—' : `${r.prevPct}%`}</td>
                  <td className="num mono" style={{ color: r.vencidos ? 'var(--danger)' : 'var(--text-3)', fontWeight: r.vencidos ? 700 : 400 }}>{r.vencidos}</td>
                  <td className="num mono">{r.enTaller || <span className="faint">0</span>}</td>
                  <td className="num mono">{r.abiertas || <span className="faint">0</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Page>
  )
}
