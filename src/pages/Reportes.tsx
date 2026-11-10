import { useMemo } from 'react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { Activity, CheckCircle2, Clock, Download, FileBarChart, Timer } from 'lucide-react'
import { Page } from '../components/Layout'
import RequireCliente from '../components/RequireCliente'
import { CHART_COLORS, Donut, Kpi } from '../components/ui'
import { useStore } from '../lib/store'
import { pct, vigencia } from '../lib/format'
import { reporteGerencialPDF, type ReporteData } from '../lib/pdf'

function Reportes({ clienteId }: { clienteId: number }) {
  const { db, cliente } = useStore()

  const r = useMemo(() => {
    const equipos = db.equipos.filter((e) => e.clienteId === clienteId && e.estado !== 'BAJA')
    const eqIds = new Set(equipos.map((e) => e.id))
    const certs = db.certificaciones.filter((c) => eqIds.has(c.equipoId))
    const mps = db.mantenimientos.filter((m) => eqIds.has(m.equipoId))
    const certVig = pct(certs.filter((c) => vigencia(c.vencimientoISO) === 'VIGENTE').length, certs.length)
    const mpVig = pct(mps.filter((m) => vigencia(m.proximoISO) === 'VIGENTE').length, mps.length)

    const ordenes = db.ordenes.filter((o) => o.clienteId === clienteId)
    const abiertas = ordenes.filter((o) => o.situacion !== 'Cerrada').length
    const cerradas = ordenes.filter((o) => o.cierreISO)
    const dur = cerradas.map((o) => (new Date(o.cierreISO!).getTime() - new Date(o.aperturaISO).getTime()) / 86400000)
    const mttr = dur.length ? Math.round(dur.reduce((a, b) => a + b, 0) / dur.length) : 0
    const sla = cerradas.length ? pct(dur.filter((d) => d <= 15).length, cerradas.length) : 0

    const tipos = new Map<string, number>()
    for (const o of ordenes) tipos.set(o.tipo, (tipos.get(o.tipo) ?? 0) + 1)
    const porTipo = [...tipos].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

    const porEquipo = new Map<number, number>()
    for (const o of ordenes) if (o.equipoId) porEquipo.set(o.equipoId, (porEquipo.get(o.equipoId) ?? 0) + 1)
    const topEquipos = [...porEquipo].map(([id, value]) => {
      const e = db.equipos.find((x) => x.id === id)
      return { name: e ? `${e.tipo} ${e.fabricante}` : `#${id}`, value }
    }).sort((a, b) => b.value - a.value).slice(0, 6)

    const now = new Date('2026-11-07')
    const meses: { name: string; value: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1)
      meses.push({ name: dt.toLocaleDateString('es-AR', { month: 'short' }), value: ordenes.filter((o) => o.aperturaISO.slice(0, 7) === dt.toISOString().slice(0, 7)).length })
    }
    const cerradasMes = cerradas.filter((o) => o.cierreISO!.slice(0, 7) === now.toISOString().slice(0, 7)).length

    return { equipos: equipos.length, certVig, mpVig, abiertas, cerradasMes, mttr, sla, porTipo, topEquipos, meses }
  }, [db, clienteId])

  const descargar = () => {
    const data: ReporteData = {
      periodo: 'Noviembre 2026', equipos: r.equipos, certVig: r.certVig, mpVig: r.mpVig,
      abiertas: r.abiertas, cerradasMes: r.cerradasMes, mttr: r.mttr, sla: r.sla,
      porTipo: r.porTipo, topEquipos: r.topEquipos,
    }
    reporteGerencialPDF(cliente!, data)
  }

  return (
    <Page title="Reportes" sub={`${cliente?.nombre} · indicadores de gestión`}
      actions={<button className="btn primary" onClick={descargar}><Download size={16} /> Informe mensual PDF</button>}>
      <div className="kpi-row">
        <Kpi label="Cumplimiento certificación" value={`${r.certVig}%`} tone={r.certVig >= 80 ? 'ok' : r.certVig >= 50 ? 'warn' : 'danger'} icon={<CheckCircle2 size={18} />} />
        <Kpi label="Cumplimiento preventivo" value={`${r.mpVig}%`} tone={r.mpVig >= 80 ? 'ok' : r.mpVig >= 50 ? 'warn' : 'danger'} icon={<Activity size={18} />} />
        <Kpi label="Tiempo medio de reparación" value={`${r.mttr}d`} tone="info" icon={<Timer size={18} />} hint="MTTR de órdenes cerradas" />
        <Kpi label="Cumplimiento de SLA" value={`${r.sla}%`} tone={r.sla >= 80 ? 'ok' : 'warn'} icon={<Clock size={18} />} hint="Cerradas en ≤ 15 días" />
      </div>

      <div className="grid-2">
        <div className="card pad">
          <h3 style={{ fontSize: 15, marginBottom: 14 }}>Órdenes por tipo</h3>
          <Donut rows={r.porTipo} colors={CHART_COLORS} center={{ top: String(r.porTipo.reduce((a, b) => a + b.value, 0)), bottom: 'órdenes' }} />
        </div>
        <div className="card pad">
          <h3 style={{ fontSize: 15, marginBottom: 14 }}>Órdenes por mes</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={r.meses} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'var(--surface-3)' }} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {r.meses.map((_, i) => <Cell key={i} fill="var(--brand)" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Equipos con más órdenes</h3><FileBarChart size={16} className="faint" /></div>
        <div className="card-body" style={{ display: 'grid', gap: 10 }}>
          {r.topEquipos.map((e) => {
            const max = Math.max(1, ...r.topEquipos.map((x) => x.value))
            return (
              <div key={e.name} style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 190px) 1fr 34px', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</span>
                <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 99 }}><div style={{ width: `${(e.value / max) * 100}%`, height: '100%', background: 'var(--brand)', borderRadius: 99 }} /></div>
                <span className="mono" style={{ fontWeight: 600, textAlign: 'right' }}>{e.value}</span>
              </div>
            )
          })}
        </div>
      </div>
    </Page>
  )
}

export default function ReportesPage() {
  return <RequireCliente>{(id) => <Reportes clienteId={id} />}</RequireCliente>
}
