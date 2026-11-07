import { useMemo, useState } from 'react'
import { Download, FileSignature, Plus, Search, X } from 'lucide-react'
import { Page } from '../components/Layout'
import RequireCliente from '../components/RequireCliente'
import { Badge, EmptyState } from '../components/ui'
import Signature from '../components/Signature'
import { useStore } from '../lib/store'
import { remitoPDF } from '../lib/pdf'
import { clean, diasDesde, fecha, normalize } from '../lib/format'
import type { OrdenServicio, SituacionOS, TipoOS } from '../lib/types'

const SITU: SituacionOS[] = ['Abierta', 'En taller', 'Esperando repuesto', 'Presupuestar', 'Lista', 'Cerrada']
const TIPOS: TipoOS[] = ['Reparación', 'Mantenimiento preventivo', 'Certificación', 'Instalación', 'Provisión']
const KANBAN: SituacionOS[] = ['Abierta', 'En taller', 'Esperando repuesto', 'Lista']

function situTone(s: SituacionOS) {
  if (s === 'Cerrada' || s === 'Lista') return 'ok'
  if (s === 'Esperando repuesto') return 'danger'
  if (s === 'Presupuestar') return 'info'
  return 'warn'
}

function Ordenes({ clienteId }: { clienteId: number }) {
  const { db, cliente, user } = useStore()
  const [view, setView] = useState<'lista' | 'tablero'>('lista')
  const [tab, setTab] = useState<'abiertas' | 'todas'>('abiertas')
  const [tipo, setTipo] = useState('')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<OrdenServicio | null>(null)
  const [nueva, setNueva] = useState(false)
  const puedeEditar = user?.rol !== 'CLIENTE'

  const todas = useMemo(() => db.ordenes.filter((o) => o.clienteId === clienteId), [db.ordenes, clienteId])
  const abiertas = todas.filter((o) => o.situacion !== 'Cerrada').length

  const rows = useMemo(() => {
    const n = normalize(q)
    return todas
      .filter((o) => (tab === 'abiertas' ? o.situacion !== 'Cerrada' : true))
      .filter((o) => !tipo || o.tipo === tipo)
      .filter((o) => !n || normalize(`${o.numero} ${o.titulo} ${o.tecnico} ${o.descripcion}`).includes(n))
  }, [todas, tab, tipo, q])

  const current = sel ? db.ordenes.find((o) => o.id === sel.id) ?? sel : null

  return (
    <Page title="Órdenes de servicio" sub={`${abiertas} abiertas · ${todas.length} en total · ${cliente?.nombre}`}
      actions={<>
        <div className="seg"><button className={view === 'lista' ? 'on' : ''} onClick={() => setView('lista')}>Lista</button><button className={view === 'tablero' ? 'on' : ''} onClick={() => setView('tablero')}>Tablero</button></div>
        {puedeEditar && <button className="btn primary" onClick={() => setNueva(true)}><Plus size={16} /> Nueva OS</button>}
      </>}>
      <div className="card pad">
        <div className="filters">
          <div className="seg"><button className={tab === 'abiertas' ? 'on' : ''} onClick={() => setTab('abiertas')}>Abiertas</button><button className={tab === 'todas' ? 'on' : ''} onClick={() => setTab('todas')}>Todas</button></div>
          <label className="search" style={{ flex: '1 1 220px' }}><Search size={16} /><input placeholder="Buscar por número, título o técnico…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
          <select className="sel" value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="">Todos los tipos</option>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select>
        </div>
      </div>

      {rows.length === 0 ? <div className="card"><EmptyState>No hay órdenes con esos filtros.</EmptyState></div> : view === 'lista' ? (
        <div className="card">
          <div className="tbl-wrap">
            <table className="tbl cards">
              <thead><tr><th>OS</th><th>Título</th><th>Tipo</th><th>Situación</th><th>Taller</th><th className="num">Días</th></tr></thead>
              <tbody>
                {rows.map((o) => {
                  const dias = o.situacion !== 'Cerrada' ? diasDesde(o.aperturaISO) : null
                  return (
                    <tr key={o.id} onClick={() => setSel(o)}>
                      <td data-label="OS"><span className="mono small">{o.numero}</span><div className="faint small">{fecha(o.aperturaISO)}</div></td>
                      <td data-label="Título"><div className="row-strong">{clean(o.titulo)}</div><div className="faint small">{clean(o.descripcion)}</div></td>
                      <td data-label="Tipo">{o.tipo}</td>
                      <td data-label="Situación"><Badge tone={situTone(o.situacion)}>{o.situacion}</Badge></td>
                      <td data-label="Taller">{o.taller}</td>
                      <td data-label="Días" className="num mono" style={{ color: dias != null && dias > 100 ? 'var(--danger)' : undefined }}>{dias ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${KANBAN.length}, minmax(220px,1fr))`, gap: 14, overflowX: 'auto' }}>
          {KANBAN.map((col) => {
            const items = rows.filter((o) => o.situacion === col)
            return (
              <div key={col} className="card" style={{ background: 'var(--surface-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px' }}>
                  <b style={{ fontSize: 13 }}>{col}</b><span className="badge">{items.length}</span>
                </div>
                <div style={{ display: 'grid', gap: 8, padding: '0 10px 12px' }}>
                  {items.map((o) => (
                    <button key={o.id} className="card pad" style={{ textAlign: 'left', padding: 12 }} onClick={() => setSel(o)}>
                      <div className="mono small faint">{o.numero}</div>
                      <div className="row-strong" style={{ fontSize: 13, margin: '3px 0' }}>{clean(o.titulo)}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                        <Badge tone={o.criticidad === 'ALTA' ? 'danger' : o.criticidad === 'MEDIA' ? 'warn' : 'neutral'}>{o.criticidad}</Badge>
                        <span className="faint small">{diasDesde(o.aperturaISO)}d</span>
                      </div>
                    </button>
                  ))}
                  {items.length === 0 && <div className="faint small" style={{ padding: 8 }}>—</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {current && <Detalle orden={current} onClose={() => setSel(null)} puedeEditar={puedeEditar} />}
      {nueva && <NuevaOS clienteId={clienteId} onClose={() => setNueva(false)} onCreated={(o) => { setNueva(false); setSel(o) }} />}
    </Page>
  )
}

function Detalle({ orden, onClose, puedeEditar }: { orden: OrdenServicio; onClose: () => void; puedeEditar: boolean }) {
  const { db, addAccion, updateOrden } = useStore()
  const equipo = db.equipos.find((e) => e.id === orden.equipoId) ?? null
  const cliente = db.clientes.find((c) => c.id === orden.clienteId)!
  const [nota, setNota] = useState('')
  const [firmando, setFirmando] = useState(false)
  const [firma, setFirma] = useState('')
  const [firmante, setFirmante] = useState('')

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <div><div className="faint small mono">{orden.numero}</div><h3 style={{ fontSize: 17 }}>{clean(orden.titulo)}</h3></div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="drawer-body">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Badge tone={situTone(orden.situacion)}>{orden.situacion}</Badge>
            <Badge tone={orden.criticidad === 'ALTA' ? 'danger' : orden.criticidad === 'MEDIA' ? 'warn' : 'neutral'}>{orden.criticidad}</Badge>
            <Badge>{orden.tipo}</Badge>
          </div>

          {puedeEditar && (
            <div className="field">
              <label>Cambiar situación</label>
              <select value={orden.situacion} onChange={(e) => { const s = e.target.value as SituacionOS; updateOrden(orden.id, { situacion: s, cierreISO: s === 'Cerrada' ? new Date().toISOString() : null }) }}>
                {SITU.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}

          <div className="card pad">
            <Row k="Equipo" v={equipo ? `${equipo.tipo} · ${equipo.fabricante} ${equipo.modelo}` : '—'} />
            {equipo && <Row k="Serie / QR" v={`${equipo.serie} · ${equipo.qr}`} />}
            <Row k="Taller" v={orden.taller} /><Row k="Técnico" v={orden.tecnico} /><Row k="Apertura" v={fecha(orden.aperturaISO)} />
            {orden.descripcion && <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}><span className="faint small">Descripción</span><div>{clean(orden.descripcion)}</div></div>}
          </div>

          <div>
            <b style={{ fontSize: 14, display: 'block', marginBottom: 10 }}>Acciones</b>
            <ul className="timeline">
              {orden.acciones.map((a) => (
                <li key={a.id}><div className="t-date">{fecha(a.fechaISO)} · {a.usuario}</div><div className="t-body" style={{ fontWeight: 400 }}>{a.nota}</div></li>
              ))}
            </ul>
            {puedeEditar && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input className="search" style={{ flex: 1 }} placeholder="Agregar una acción…" value={nota} onChange={(e) => setNota(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && nota.trim()) { addAccion(orden.id, nota.trim()); setNota('') } }} />
                <button className="btn secondary" disabled={!nota.trim()} onClick={() => { addAccion(orden.id, nota.trim()); setNota('') }}>Agregar</button>
              </div>
            )}
          </div>

          {orden.firmaDataUrl && orden.firmaDataUrl.startsWith('data:') && (
            <div className="card pad"><span className="faint small">Conforme firmado por {orden.firmante}</span><img src={orden.firmaDataUrl} alt="firma" style={{ maxHeight: 70, marginTop: 6 }} /></div>
          )}

          {puedeEditar && firmando && (
            <div className="card pad" style={{ display: 'grid', gap: 10 }}>
              <div className="field"><label>Nombre de quien firma</label><input value={firmante} onChange={(e) => setFirmante(e.target.value)} placeholder="Recepción del cliente" /></div>
              <Signature onChange={setFirma} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn ghost sm" onClick={() => setFirmando(false)}>Cancelar</button>
                <button className="btn primary sm" disabled={!firma} onClick={() => { updateOrden(orden.id, { firmaDataUrl: firma, firmante: firmante || 'Recepción del cliente' }); setFirmando(false) }}>Guardar firma</button>
              </div>
            </div>
          )}
        </div>
        <div className="drawer-foot">
          {puedeEditar && !firmando && <button className="btn secondary" onClick={() => setFirmando(true)}><FileSignature size={16} /> Firmar conforme</button>}
          <button className="btn primary" onClick={() => remitoPDF(orden, equipo, cliente)}><Download size={16} /> Remito PDF</button>
        </div>
      </aside>
    </>
  )
}

function NuevaOS({ clienteId, onClose, onCreated }: { clienteId: number; onClose: () => void; onCreated: (o: OrdenServicio) => void }) {
  const { db, addOrden } = useStore()
  const equipos = db.equipos.filter((e) => e.clienteId === clienteId && e.estado !== 'BAJA')
  const servicios = new Map(db.servicios.map((s) => [s.id, s.nombre]))
  const [equipoId, setEquipoId] = useState('')
  const [tipo, setTipo] = useState<TipoOS>('Reparación')
  const [descripcion, setDescripcion] = useState('')
  const [criticidad, setCriticidad] = useState<'ALTA' | 'MEDIA' | 'BAJA'>('MEDIA')
  const [taller, setTaller] = useState(db.talleres[0])
  const eq = equipos.find((e) => String(e.id) === equipoId)

  const crear = () => {
    const o = addOrden({
      clienteId, equipoId: eq?.id ?? null, servicioId: eq?.servicioId ?? db.servicios.find((s) => s.clienteId === clienteId)!.id,
      tipo, titulo: `${tipo}: ${eq ? `${eq.tipo} ${eq.fabricante}` : 'Equipo'}`, descripcion,
      criticidad, situacion: 'Abierta', taller, tecnico: 'tecnico',
    })
    onCreated(o)
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" onClick={onClose}>
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-head"><h3 style={{ fontSize: 17 }}>Nueva orden de servicio</h3><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
          <div style={{ padding: 20, display: 'grid', gap: 14 }}>
            <div className="field"><label>Equipo</label><select value={equipoId} onChange={(e) => setEquipoId(e.target.value)}><option value="">Sin equipo asociado</option>{equipos.map((e) => <option key={e.id} value={e.id}>{e.tipo} · {e.fabricante} {e.modelo} · {e.serie} ({servicios.get(e.servicioId)})</option>)}</select></div>
            <div className="grid-2" style={{ gap: 14 }}>
              <div className="field"><label>Tipo</label><select value={tipo} onChange={(e) => setTipo(e.target.value as TipoOS)}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select></div>
              <div className="field"><label>Criticidad</label><select value={criticidad} onChange={(e) => setCriticidad(e.target.value as 'ALTA' | 'MEDIA' | 'BAJA')}>{['ALTA', 'MEDIA', 'BAJA'].map((c) => <option key={c}>{c}</option>)}</select></div>
            </div>
            <div className="field"><label>Taller</label><select value={taller} onChange={(e) => setTaller(e.target.value)}>{db.talleres.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div className="field"><label>Descripción del problema</label><textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Qué le pasa al equipo…" /></div>
          </div>
          <div className="drawer-foot"><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={crear}>Crear orden</button></div>
        </div>
      </div>
    </>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '3px 0', fontSize: 13 }}><span className="faint">{k}</span><span style={{ fontWeight: 500, textAlign: 'right' }}>{v}</span></div>
}

export default function OrdenesPage() {
  return <RequireCliente>{(id) => <Ordenes clienteId={id} />}</RequireCliente>
}
