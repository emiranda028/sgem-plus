import { useMemo } from 'react'
import { Activity, CheckCircle2, Clock, Download, Timer } from 'lucide-react'
import { Page } from '../components/Layout'
import RequireCliente from '../components/RequireCliente'
import { Kpi } from '../components/ui'
import { useStore } from '../lib/store'
import { pct, vigencia } from '../lib/format'
import { reporteGerencialPDF, type ReporteData } from '../lib/pdf'

/** Columnas con lectura arriba; `b` dibuja una segunda columna hueca al lado. */
function Columnas({ rows, corte, corteTxt }: { rows: { name: string; a: number; b?: number; fuera?: boolean }[]; corte?: number; corteTxt?: string }) {
  const max = Math.max(1, ...rows.flatMap((x) => [x.a, x.b ?? 0]))
  return (
    <div className="cl">
      {rows.map((x, i) => (
        <div key={x.name} className={`cl-col ${x.fuera ? 'fuera' : ''} ${corte === i ? 'corte' : ''}`}>
          {corte === i && <span className="cl-corte">{corteTxt}</span>}
          <div className="cl-bars">
            <span className="cl-b a" style={{ ['--f' as string]: x.a / max }}><b>{x.a}</b></span>
            {x.b != null && <span className="cl-b b" style={{ ['--f' as string]: x.b / max }}><b>{x.b}</b></span>}
          </div>
          <small>{x.name}</small>
        </div>
      ))}
    </div>
  )
}

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
    const meses: { name: string; abre: number; cierra: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
      meses.push({
        name: dt.toLocaleDateString('es-AR', { month: 'short' }).replace('.', ''),
        abre: ordenes.filter((o) => o.aperturaISO.slice(0, 7) === k).length,
        cierra: cerradas.filter((o) => o.cierreISO!.slice(0, 7) === k).length,
      })
    }
    const cerradasMes = cerradas.filter((o) => o.cierreISO!.slice(0, 7) === now.toISOString().slice(0, 7)).length
    const TRAMOS: [string, number, number][] = [['0–5', 0, 5], ['6–10', 6, 10], ['11–15', 11, 15], ['16–20', 16, 20], ['21–30', 21, 30], ['31+', 31, 1e9]]
    const tramos = TRAMOS.map(([name, a, b]) => ({ name, value: dur.filter((d) => Math.round(d) >= a && Math.round(d) <= b).length, fuera: a > 15 }))

    return { equipos: equipos.length, certVig, mpVig, abiertas, cerradasMes, mttr, sla, porTipo, topEquipos, meses, tramos, cerradas: cerradas.length, total: ordenes.length }
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
    <Page title="Reportes" sub={`${cliente?.nombre} · informe de gestión · noviembre 2026`}
      actions={<button className="btn primary" onClick={descargar}><Download size={16} /> Informe mensual PDF</button>}>
      <div className="kpi-row">
        <Kpi label="Cumplimiento certificación" value={`${r.certVig}%`} tone={r.certVig >= 80 ? 'ok' : r.certVig >= 50 ? 'warn' : 'danger'} icon={<CheckCircle2 size={18} />} />
        <Kpi label="Cumplimiento preventivo" value={`${r.mpVig}%`} tone={r.mpVig >= 80 ? 'ok' : r.mpVig >= 50 ? 'warn' : 'danger'} icon={<Activity size={18} />} />
        <Kpi label="Tiempo medio de reparación" value={`${r.mttr}d`} tone="info" icon={<Timer size={18} />} hint="MTTR de órdenes cerradas" />
        <Kpi label="Cumplimiento de SLA" value={`${r.sla}%`} tone={r.sla >= 80 ? 'ok' : 'warn'} icon={<Clock size={18} />} hint="Cerradas en ≤ 15 días" />
      </div>

      <div className="rp-grid">
        <section className="rp">
          <div className="rp-top"><span>Órdenes por tipo</span><span><b>{r.total}</b> órdenes</span></div>
          <div className="rp-tira">{r.porTipo.map((t, i) => <span key={t.name} className={`s${i % 5}`} style={{ flexGrow: t.value }} />)}</div>
          <ol className="rp-list">
            {r.porTipo.map((t, i) => (
              <li key={t.name}><i className={`s${i % 5}`} /><span>{t.name}</span><small>{pct(t.value, r.total)}%</small><b>{t.value}</b></li>
            ))}
          </ol>
        </section>

        <section className="rp">
          <div className="rp-top"><span>Órdenes por mes</span><span className="rp-key"><i className="a" />abiertas<i className="c" />cerradas</span></div>
          <Columnas rows={r.meses.map((m) => ({ name: m.name, a: m.abre, b: m.cierra }))} />
        </section>

        <section className="rp">
          <div className="rp-top"><span>Tiempo de resolución · días</span><span><b>{r.sla}</b>% dentro de SLA</span></div>
          <Columnas rows={r.tramos.map((t) => ({ name: t.name, a: t.value, fuera: t.fuera }))} corte={3} corteTxt="SLA 15 días" />
          <p className="rp-note">{r.cerradas} órdenes cerradas · promedio {r.mttr} días.</p>
        </section>

        <section className="rp">
          <div className="rp-top"><span>Equipos con más órdenes</span><span>historial completo</span></div>
          <ol className="rp-rank">
            {r.topEquipos.map((e, i) => {
              const max = Math.max(1, ...r.topEquipos.map((x) => x.value))
              return (
                <li key={e.name + i}>
                  <em>{String(i + 1).padStart(2, '0')}</em>
                  <span>{e.name}<i><u style={{ width: `${(e.value / max) * 100}%` }} /></i></span>
                  <b>{e.value}</b>
                </li>
              )
            })}
          </ol>
        </section>
      </div>
    </Page>
  )
}

export default function ReportesPage() {
  return <RequireCliente>{(id) => <Reportes clienteId={id} />}</RequireCliente>
}
