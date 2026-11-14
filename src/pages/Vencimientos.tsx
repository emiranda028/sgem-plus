import { useMemo, useState } from 'react'
import { CalendarClock, ChevronLeft, ChevronRight, Download, ShieldCheck, X, Zap } from 'lucide-react'
import { addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { Page } from '../components/Layout'
import RequireCliente from '../components/RequireCliente'
import { Badge, EmptyState, Kpi } from '../components/ui'
import { SelectBox, SelectToggle, SelectionBar, useSelection } from '../components/Selection'
import { useAlertas, useStore, type Alerta } from '../lib/store'
import { NOW, diasHasta, fecha, vigencia } from '../lib/format'
import { exportCsv, shareSelectionImage } from '../lib/share'

function grupo(a: Alerta): string {
  const d = diasHasta(a.vencimientoISO) ?? 0
  if (d < 0) return 'Vencidos'
  if (d <= 7) return 'Esta semana'
  if (d <= 30) return 'Este mes'
  return 'Más adelante'
}
const ORDEN = ['Vencidos', 'Esta semana', 'Este mes', 'Más adelante']
const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function Calendario({ alertas, onDay }: { alertas: Alerta[]; onDay: (d: Date) => void }) {
  const [cursor, setCursor] = useState(() => startOfMonth(NOW))
  const dias = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [cursor])
  const porDia = useMemo(() => {
    const m = new Map<string, Alerta[]>()
    for (const a of alertas) {
      const k = a.vencimientoISO.slice(0, 10)
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(a)
    }
    return m
  }, [alertas])

  return (
    <div className="card pad cal">
      <div className="cal-head">
        <div className="cal-title">{format(cursor, 'MMMM yyyy', { locale: es })}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="icon-btn" onClick={() => setCursor((c) => addMonths(c, -1))}><ChevronLeft size={18} /></button>
          <button className="btn secondary sm" onClick={() => setCursor(startOfMonth(NOW))}>Hoy</button>
          <button className="icon-btn" onClick={() => setCursor((c) => addMonths(c, 1))}><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="cal-grid">
        {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
        {dias.map((day) => {
          const k = format(day, 'yyyy-MM-dd')
          const items = porDia.get(k) ?? []
          const venc = items.some((a) => a.estado === 'VENCIDO')
          const inMonth = isSameMonth(day, cursor)
          const today = isSameDay(day, NOW)
          return (
            <div key={k} className={`cal-cell ${inMonth ? '' : 'muted-day'} ${today ? 'today' : ''} ${items.length ? 'has' : ''}`} onClick={() => items.length && onDay(day)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="d">{format(day, 'd')}</span>
                {items.length > 0 && <span className="cal-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: venc ? 'var(--danger)' : 'var(--warn)' }} />}
              </div>
              {items.slice(0, 2).map((a, i) => (
                <span key={i} className={`cal-pill ${a.estado === 'VENCIDO' ? 'v' : 'w'}`}>{a.tipo === 'Certificación' ? 'Cert' : 'MP'} · {a.equipo.split(' ')[0]}</span>
              ))}
              {items.length > 2 && <span className="faint" style={{ fontSize: 10 }}>+{items.length - 2} más</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- Regla de vencimientos: carga por semana, de lo atrasado a lo que viene ---------- */
const SEM_ATRAS = 8, SEM_ADEL = 13
const LUNES = startOfWeek(NOW, { weekStartsOn: 1 })
const semanaDe = (isoStr: string) => Math.floor((new Date(isoStr).getTime() - LUNES.getTime()) / (7 * 86400000))
const enSemana = (a: Alerta, k: number) => { const s = semanaDe(a.vencimientoISO); return k < -SEM_ATRAS ? s < -SEM_ATRAS : s === k }
const tituloSemana = (k: number) => k < -SEM_ATRAS
  ? `Atrasados de más de ${SEM_ATRAS} semanas`
  : `Semana del ${format(addDays(LUNES, k * 7), "d 'de' MMM", { locale: es })} al ${format(addDays(LUNES, k * 7 + 6), "d 'de' MMM", { locale: es })}`

function Regla({ items, sel, onSel }: { items: Alerta[]; sel: number | null; onSel: (k: number | null) => void }) {
  const cols = useMemo(() => {
    const ks = [-SEM_ATRAS - 1, ...Array.from({ length: SEM_ATRAS + SEM_ADEL + 1 }, (_, i) => i - SEM_ATRAS)]
    return ks.map((k) => ({ k, n: items.filter((a) => enSemana(a, k)).length }))
  }, [items])
  const max = Math.max(1, ...cols.map((c) => c.n))
  const atras = cols.filter((c) => c.k < 0).reduce((s, c) => s + c.n, 0)
  const mes = cols.filter((c) => c.k >= 0 && c.k <= 4).reduce((s, c) => s + c.n, 0)
  return (
    <section className="rg" aria-label="Carga de vencimientos por semana">
      <div className="rg-top">
        <span>Regla de vencimientos · carga por semana</span>
        <span><b className="d">{atras}</b> atrasados<i /> <b className="w">{mes}</b> en 5 semanas</span>
      </div>
      <div className="rg-plot">
        {cols.map(({ k, n }) => {
          const zona = k < 0 ? 'past' : k <= 4 ? 'soon' : 'later'
          const ini = addDays(LUNES, k * 7)
          const marca = k < -SEM_ATRAS ? 'antes' : k === 0 ? 'hoy' : ini.getDate() <= 7 ? format(ini, 'MMM', { locale: es }).replace('.', '') : ''
          return (
            <button key={k} type="button" className={`rg-col ${zona} ${k === 0 ? 'hoy' : ''} ${sel === k ? 'on' : ''} ${n ? '' : 'zero'}`}
              onClick={() => onSel(sel === k ? null : k)} disabled={!n} aria-label={`${tituloSemana(k)}: ${n}`}>
              <span className="rg-n">{n || ''}</span>
              <span className="rg-bar" style={{ ['--f' as string]: n / max }} />
              <span className="rg-tick" />
              <span className="rg-lbl">{marca}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function Vencimientos({ clienteId }: { clienteId: number }) {
  const { cliente, generarPlan, user } = useStore()
  const alertas = useAlertas(clienteId)
  const [generadas, setGeneradas] = useState<number | null>(null)
  const generar = () => setGeneradas(generarPlan(clienteId))
  const [filtro, setFiltro] = useState<'Todos' | 'Certificación' | 'Mantenimiento'>('Todos')
  const [view, setView] = useState<'lista' | 'calendario'>('lista')
  const [dia, setDia] = useState<Date | null>(null)
  const selection = useSelection()
  const aid = (a: Alerta) => a.equipoId * 2 + (a.tipo === 'Certificación' ? 0 : 1)

  const { db } = useStore()
  const [semana, setSemana] = useState<number | null>(null)
  // Todos los vencimientos del cliente (también los vigentes), para la regla.
  const todos = useMemo(() => {
    const eq = new Map(db.equipos.map((e) => [e.id, e]))
    const sv = new Map(db.servicios.map((x) => [x.id, x.nombre]))
    const out: Alerta[] = []
    const push = (tipo: Alerta['tipo'], equipoId: number, vencISO: string) => {
      const e = eq.get(equipoId)
      if (!e || e.estado === 'BAJA' || e.clienteId !== clienteId) return
      out.push({ tipo, equipoId, equipo: `${e.tipo} ${e.fabricante} ${e.modelo}`, cliente: cliente?.nombre ?? '', clienteId, servicio: sv.get(e.servicioId) ?? '', vencimientoISO: vencISO, estado: vigencia(vencISO) } as Alerta)
    }
    for (const c of db.certificaciones) push('Certificación', c.equipoId, c.vencimientoISO)
    for (const m of db.mantenimientos) push('Mantenimiento', m.equipoId, m.proximoISO)
    return out.sort((a, b) => a.vencimientoISO.localeCompare(b.vencimientoISO))
  }, [db, clienteId, cliente])
  const porTipo = useMemo(() => todos.filter((a) => filtro === 'Todos' || a.tipo === filtro), [todos, filtro])

  const rows = useMemo(
    () => (semana === null ? alertas : todos.filter((a) => enSemana(a, semana))).filter((a) => filtro === 'Todos' || a.tipo === filtro),
    [alertas, todos, semana, filtro],
  )
  const grupos = useMemo(() => {
    if (semana !== null) return rows.length ? [[tituloSemana(semana), rows] as const] : []
    const m = new Map<string, Alerta[]>()
    for (const a of rows) { const g = grupo(a); (m.get(g) ?? m.set(g, []).get(g)!).push(a) }
    return ORDEN.map((g) => [g, m.get(g) ?? []] as const).filter(([, l]) => l.length)
  }, [rows, semana])

  const vencidos = alertas.filter((a) => a.estado === 'VENCIDO').length
  const cert = alertas.filter((a) => a.tipo === 'Certificación').length
  const mp = alertas.filter((a) => a.tipo === 'Mantenimiento').length
  const delDia = dia ? rows.filter((a) => isSameDay(new Date(a.vencimientoISO), dia)) : []

  const download = () => exportCsv('vencimientos.csv', rows.map((a) => ({ Tipo: a.tipo, Equipo: a.equipo, Servicio: a.servicio, Vencimiento: fecha(a.vencimientoISO), Estado: a.estado })))

  return (
    <Page title="Vencimientos" sub={`${cliente?.nombre} · certificaciones y mantenimientos`}
      actions={<>
        <div className="seg"><button className={view === 'lista' ? 'on' : ''} onClick={() => setView('lista')}>Lista</button><button className={view === 'calendario' ? 'on' : ''} onClick={() => { setView('calendario'); setDia(null); setSemana(null) }}>Calendario</button></div>
        {view === 'lista' && <SelectToggle on={selection.on} onToggle={() => (selection.on ? selection.exit() : selection.setOn(true))} />}
        <button className="btn secondary" onClick={download} disabled={!rows.length}><Download size={16} /> Exportar</button>
        {user?.rol !== 'CLIENTE' && <button className="btn primary" onClick={generar}><Zap size={16} /> Generar órdenes</button>}
      </>}>
      {generadas !== null && (
        <div className="card pad" style={{ display: 'flex', alignItems: 'center', gap: 10, background: generadas ? 'var(--ok-soft)' : 'var(--surface-2)', borderColor: 'transparent' }}>
          <Zap size={18} style={{ color: generadas ? 'var(--ok)' : 'var(--text-3)' }} />
          <span style={{ fontWeight: 500 }}>{generadas ? `Se generaron ${generadas} órdenes automáticas para los vencimientos próximos.` : 'No hay vencimientos nuevos para generar: ya tienen una orden abierta.'}</span>
        </div>
      )}
      <div className="kpi-row kpi-3">
        <Kpi label="Total a atender" value={alertas.length} tone="warn" icon={<CalendarClock size={18} />} hint={`${vencidos} ya vencidos`} />
        <Kpi label="Certificaciones" value={cert} tone="info" icon={<ShieldCheck size={18} />} />
        <Kpi label="Mantenimientos" value={mp} tone="accent" icon={<CalendarClock size={18} />} />
      </div>

      {view === 'lista' && <Regla items={porTipo} sel={semana} onSel={(k) => { setSemana(k); selection.clear() }} />}

      <div className="card pad">
        <div className="filters">
          {(['Todos', 'Certificación', 'Mantenimiento'] as const).map((f) => (
            <button key={f} className={`chip ${filtro === f ? 'on' : ''}`} onClick={() => setFiltro(f)}>{f}</button>
          ))}
          {semana !== null && view === 'lista' && <button className="chip on rg-clear" onClick={() => setSemana(null)}><X size={13} /> Quitar semana</button>}
        </div>
      </div>

      {view === 'calendario' ? (
        <>
          <Calendario alertas={rows} onDay={setDia} />
          {dia && (
            <div className="card">
              <div className="card-head"><h3 style={{ textTransform: 'capitalize' }}>{format(dia, "EEEE d 'de' MMMM", { locale: es })}</h3><span className="badge">{delDia.length}</span></div>
              <div className="tbl-wrap"><table className="tbl cards"><tbody>
                {delDia.map((a, i) => (
                  <tr key={i} style={{ cursor: 'default' }}>
                    <td data-label="Tipo"><Badge tone={a.tipo === 'Certificación' ? 'info' : 'accent'}>{a.tipo}</Badge></td>
                    <td data-label="Equipo" className="row-strong">{a.equipo}</td>
                    <td data-label="Servicio">{a.servicio}</td>
                    <td data-label="Estado"><Badge tone={a.estado === 'VENCIDO' ? 'danger' : 'warn'}>{a.estado === 'VENCIDO' ? 'Vencido' : 'Por vencer'}</Badge></td>
                  </tr>
                ))}
              </tbody></table></div>
            </div>
          )}
        </>
      ) : grupos.length === 0 ? <div className="card"><EmptyState icon={<ShieldCheck size={22} />}>Todo al día. Sin vencimientos próximos.</EmptyState></div> : grupos.map(([g, list]) => (
        <div className="card" key={g}>
          <div className="card-head">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`badge ${g === 'Vencidos' || (semana !== null && semana < 0) ? 'tone-danger' : g === 'Esta semana' || (semana !== null && semana <= 4) ? 'tone-warn' : 'tone-info'}`}>{list.length}</span>
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
                    <tr key={i} className={`${selection.on ? 'selectable' : ''} ${selection.has(aid(a)) ? 'selected' : ''}`} onClick={selection.on ? () => selection.toggle(aid(a)) : undefined} style={selection.on ? undefined : { cursor: 'default' }}>
                      <td data-label="Tipo"><div className="sel-head">{selection.on && <SelectBox checked={selection.has(aid(a))} />}<Badge tone={a.tipo === 'Certificación' ? 'info' : 'accent'}>{a.tipo}</Badge></div></td>
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
      {view === 'lista' && selection.on && (
        <SelectionBar count={selection.size} total={rows.length}
          onAll={() => selection.selectMany(rows.map(aid))}
          onClear={selection.clear}
          onCsv={() => exportCsv('vencimientos-seleccion.csv', rows.filter((a) => selection.has(aid(a))).map((a) => ({ Tipo: a.tipo, Equipo: a.equipo, Servicio: a.servicio, Vencimiento: fecha(a.vencimientoISO), Estado: a.estado })))}
          onImg={() => shareSelectionImage({ title: 'Vencimientos', subtitle: cliente?.nombre, filename: 'vencimientos-sgem.png', items: rows.filter((a) => selection.has(aid(a))).map((a) => ({ titulo: a.equipo, lineas: [`${a.tipo} · ${a.servicio}`, `Vence ${fecha(a.vencimientoISO)}`, a.estado === 'VENCIDO' ? 'VENCIDO' : (diasHasta(a.vencimientoISO) ?? 0) <= 30 ? 'Por vencer' : 'Vigente'] })) })}
        />
      )}
    </Page>
  )
}

export default function VencimientosPage() {
  return <RequireCliente>{(id) => <Vencimientos clienteId={id} />}</RequireCliente>
}
