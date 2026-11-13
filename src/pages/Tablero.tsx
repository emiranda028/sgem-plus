import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { BadgeCheck, CalendarClock, Stethoscope, Wrench } from 'lucide-react'
import { Page } from '../components/Layout'
import RequireCliente from '../components/RequireCliente'
import { Badge, CHART_COLORS, Donut, EmptyState, IconTile, Kpi, Progress, iconOS, useIsMobile } from '../components/ui'
import { useStore } from '../lib/store'
import { clean, diasDesde, fecha, pct, vigencia } from '../lib/format'

function situTone(s: string): 'ok' | 'danger' | 'warn' {
  return s === 'Cerrada' || s === 'Lista' ? 'ok' : s === 'Esperando repuesto' ? 'danger' : 'warn'
}

function Tab({ clienteId }: { clienteId: number }) {
  const { db, cliente } = useStore()
  const isMobile = useIsMobile()
  const d = useMemo(() => {
    const equipos = db.equipos.filter((e) => e.clienteId === clienteId && e.estado !== 'BAJA')
    const servicios = db.servicios.filter((s) => s.clienteId === clienteId)
    const eqIds = new Set(equipos.map((e) => e.id))
    const certs = db.certificaciones.filter((c) => eqIds.has(c.equipoId))
    const mps = db.mantenimientos.filter((m) => eqIds.has(m.equipoId))
    const ordenes = db.ordenes.filter((o) => o.clienteId === clienteId)

    const vig = (arr: { v: string }[]) => {
      let ok = 0, pv = 0, ven = 0
      for (const x of arr) { const s = vigencia(x.v); if (s === 'VIGENTE') ok++; else if (s === 'POR_VENCER') pv++; else if (s === 'VENCIDO') ven++ }
      return { ok, pv, ven, total: arr.length }
    }
    const cert = vig(certs.map((c) => ({ v: c.vencimientoISO })))
    const mp = vig(mps.map((m) => ({ v: m.proximoISO })))
    const enTaller = equipos.filter((e) => e.estado === 'EN TALLER')

    // por servicio
    const porServicio = servicios.map((s) => {
      const eq = equipos.filter((e) => e.servicioId === s.id)
      const sIds = new Set(eq.map((e) => e.id))
      const c = vig(certs.filter((x) => sIds.has(x.equipoId)).map((x) => ({ v: x.vencimientoISO })))
      const m = vig(mps.filter((x) => sIds.has(x.equipoId)).map((x) => ({ v: x.proximoISO })))
      return { id: s.id, nombre: s.nombre, equipos: eq.length, taller: eq.filter((e) => e.estado === 'EN TALLER').length, cert: c, mp: m }
    }).filter((x) => x.equipos > 0).sort((a, b) => b.equipos - a.equipos)

    const pertenencia = ['Propio', 'Comodato', 'Alquilado', 'Otros'].map((p) => ({ name: p, value: equipos.filter((e) => e.pertenencia === p).length })).filter((x) => x.value)

    // OS últimos 6 meses
    const now = new Date('2026-11-07')
    const meses: { name: string; value: number; parcial: boolean }[] = []
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1)
      // clave armada a mano: toISOString corre el mes en zonas horarias al este de UTC
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
      const label = dt.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')
      meses.push({ name: i === 0 ? `${label} *` : label, value: ordenes.filter((o) => o.aperturaISO.slice(0, 7) === key).length, parcial: i === 0 })
    }

    return { equipos, cert, mp, enTaller, porServicio, pertenencia, ordenes, meses }
  }, [db, clienteId])

  return (
    <Page title="Tablero" sub={cliente?.nombre}>
      <div className="kpi-row">
        <Kpi label="Equipos activos" value={d.equipos.length} tone="brand" icon={<Stethoscope size={18} />} hint={`${d.enTaller.length} en taller ahora`} to="/equipos" />
        <Kpi label="Certificaciones vigentes" value={`${pct(d.cert.ok, d.cert.total)}%`} tone={meta(pct(d.cert.ok, d.cert.total))} icon={<BadgeCheck size={18} />} hint={<span style={{ color: 'var(--danger)' }}>{d.cert.ven} vencidas · {d.cert.pv} por vencer</span>} to="/vencimientos" />
        <Kpi label="Preventivos vigentes" value={`${pct(d.mp.ok, d.mp.total)}%`} tone={meta(pct(d.mp.ok, d.mp.total))} icon={<CalendarClock size={18} />} hint={<span style={{ color: 'var(--danger)' }}>{d.mp.ven} vencidos</span>} to="/vencimientos" />
        <Kpi label="En taller" value={d.enTaller.length} tone={d.enTaller.length ? 'warn' : 'neutral'} icon={<Wrench size={18} />} hint="Ver detalle en Taller" to="/taller" />
      </div>

      <div className="grid-dash">
        <div className="card">
          <div className="card-head"><h3>Estado por servicio</h3><span className="faint small">{d.porServicio.length} servicios</span></div>
          {isMobile ? (
            <div className="card-body stagger" style={{ display: 'grid', gap: 10 }}>
              {d.porServicio.map((s) => {
                const cp = pct(s.cert.ok, s.cert.total), mpp = pct(s.mp.ok, s.mp.total)
                return (
                  <div key={s.id} className="svc-card">
                    <div className="sc-top">
                      <span className="sc-name">{s.nombre}</span>
                      {s.taller > 0 && <Badge tone="warn">{s.taller} en taller</Badge>}
                      <span className="sc-count">{s.equipos}</span>
                    </div>
                    {s.cert.total > 0 && <div className="sc-bar"><span className="lbl">Certif.</span><Progress value={cp} tone={cp >= 80 ? 'ok' : cp >= 50 ? 'warn' : 'danger'} /><span className="val">{s.cert.ok}/{s.cert.total}</span></div>}
                    {s.mp.total > 0 && <div className="sc-bar"><span className="lbl">Prevent.</span><Progress value={mpp} tone={mpp >= 80 ? 'ok' : mpp >= 50 ? 'warn' : 'danger'} /><span className="val">{s.mp.ok}/{s.mp.total}</span></div>}
                  </div>
                )
              })}
            </div>
          ) : (
          <div className="tbl-wrap">
            <table className="tbl cards">
              <thead><tr><th>Servicio</th><th className="num">Equipos</th><th className="num">Taller</th><th>Certificación</th><th>Preventivo</th></tr></thead>
              <tbody>
                {d.porServicio.map((s) => {
                  const cp = pct(s.cert.ok, s.cert.total)
                  const mpp = pct(s.mp.ok, s.mp.total)
                  return (
                    <tr key={s.id}>
                      <td data-label="Servicio" className="row-strong">{s.nombre}</td>
                      <td data-label="Equipos" className="num mono">{s.equipos}</td>
                      <td data-label="Taller" className="num mono">{s.taller || <span className="faint">0</span>}</td>
                      <td data-label="Certificación">
                        {s.cert.total ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}><Progress value={cp} tone={cp >= 80 ? 'ok' : cp >= 50 ? 'warn' : 'danger'} /><span className="small mono" style={{ whiteSpace: 'nowrap' }}>{s.cert.ok}/{s.cert.total}</span></div> : <span className="faint small">No aplica</span>}
                      </td>
                      <td data-label="Preventivo">
                        {s.mp.total ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}><Progress value={mpp} tone={mpp >= 80 ? 'ok' : mpp >= 50 ? 'warn' : 'danger'} /><span className="small mono" style={{ whiteSpace: 'nowrap' }}>{s.mp.ok}/{s.mp.total}</span></div> : <span className="faint small">No aplica</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: 20 }}>
          <div className="card pad">
            <h3 style={{ fontSize: 15, marginBottom: 14 }}>Pertenencia del parque</h3>
            {d.pertenencia.length ? <Donut rows={d.pertenencia} colors={CHART_COLORS} center={{ top: String(d.equipos.length), bottom: 'equipos' }} /> : <EmptyState />}
          </div>
          <div className="card pad">
            <h3 style={{ fontSize: 15, marginBottom: 6 }}>Órdenes por mes</h3>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={d.meses} margin={{ top: 22, right: 4, left: 4, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'var(--surface-3)' }} formatter={(v: number) => [`${v} órdenes`, '']} contentStyle={{ borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12 }} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                  {d.meses.map((m) => <Cell key={m.name} fill={m.parcial ? 'var(--brand-soft)' : 'var(--brand)'} stroke={m.parcial ? 'var(--brand)' : undefined} strokeDasharray={m.parcial ? '3 2' : undefined} />)}
                  <LabelList dataKey="value" position="top" offset={6} style={{ fontSize: 12, fontWeight: 700, fill: 'var(--text)' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="faint small" style={{ margin: '6px 0 0' }}>* Mes en curso</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Últimas órdenes de servicio</h3><Link to="/ordenes" className="btn ghost sm">Ver todas</Link></div>
        {isMobile ? (
          <div className="card-body mcards stagger">
            {d.ordenes.slice(0, 6).map((o) => {
              const tone = situTone(o.situacion)
              const dias = o.situacion !== 'Cerrada' ? diasDesde(o.aperturaISO) : null
              return (
                <Link key={o.id} to="/ordenes" className={`mcard acc-${tone}`}>
                  <IconTile icon={iconOS(o.tipo)} tone={tone} size={40} />
                  <div className="mc-body">
                    <div className="mc-title">{clean(o.titulo)}</div>
                    <div className="mc-sub">{o.numero}</div>
                    <div className="mc-chips"><Badge tone={tone}>{o.situacion}</Badge></div>
                  </div>
                  <div className="mc-right">{dias != null && <span className="big mono">{dias}d</span>}<span className="faint small">{fecha(o.aperturaISO)}</span></div>
                </Link>
              )
            })}
          </div>
        ) : (
        <div className="tbl-wrap">
          <table className="tbl cards">
            <thead><tr><th>OS</th><th>Título</th><th>Situación</th><th className="num">Antigüedad</th></tr></thead>
            <tbody>
              {d.ordenes.slice(0, 6).map((o) => (
                <tr key={o.id}>
                  <td data-label="OS"><span className="mono small">{o.numero}</span></td>
                  <td data-label="Título" className="row-strong">{o.titulo}</td>
                  <td data-label="Situación"><span className={`badge ${o.situacion === 'Cerrada' ? 'tone-ok' : o.situacion === 'Esperando repuesto' ? 'tone-danger' : 'tone-warn'}`}>{o.situacion}</span></td>
                  <td data-label="Antigüedad" className="num mono small faint">{o.situacion === 'Cerrada' ? '—' : `${diasDesde(o.aperturaISO)}d`}<br />{fecha(o.aperturaISO)}</td>
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

/** Semáforo de cumplimiento: verde desde 80%, ámbar desde 50%, rojo debajo. */
const meta = (v: number) => (v >= 80 ? 'ok' : v >= 50 ? 'warn' : 'danger') as 'ok' | 'warn' | 'danger'

export default function Tablero() {
  return <RequireCliente>{(id) => <Tab clienteId={id} />}</RequireCliente>
}
