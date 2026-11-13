import { useMemo, useState } from 'react'
import { useRef } from 'react'
import { Award, Camera, CheckCircle2, Circle, CircleDot, ClipboardCheck, Clock, Download, FileSignature, Plus, Search, Trash2, UserRound, X } from 'lucide-react'
import { plantillaProtocolo } from '../lib/protocolos'
import { certificadoPDF, informeEnsayoPDF, remitoPDF } from '../lib/pdf'
import type { EstadoTarea, Protocolo } from '../lib/types'
import { Page } from '../components/Layout'
import RequireCliente from '../components/RequireCliente'
import { Badge, EmptyState, IconTile, iconOS, useIsMobile } from '../components/ui'
import { SelectBox, SelectToggle, SelectionBar, useSelection } from '../components/Selection'
import { exportCsv, shareSelectionImage } from '../lib/share'
import Signature from '../components/Signature'
import { useStore } from '../lib/store'
import { clean, diasDesde, diasHasta, fecha, normalize } from '../lib/format'
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
  const isMobile = useIsMobile()
  const selection = useSelection()

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
        <SelectToggle on={selection.on} onToggle={() => (selection.on ? selection.exit() : selection.setOn(true))} />
        {puedeEditar && <button className="btn primary" onClick={() => setNueva(true)}><Plus size={16} /> Nueva OS</button>}
      </>}>
      <div className="card pad">
        <div className="filters">
          <div className="seg"><button className={tab === 'abiertas' ? 'on' : ''} onClick={() => setTab('abiertas')}>Abiertas</button><button className={tab === 'todas' ? 'on' : ''} onClick={() => setTab('todas')}>Todas</button></div>
          <label className="search" style={{ flex: '1 1 220px' }}><Search size={16} /><input placeholder="Buscar por número, título o técnico…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
          <select className="sel" value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="">Todos los tipos</option>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select>
        </div>
      </div>

      {rows.length === 0 ? <div className="card"><EmptyState>No hay órdenes con esos filtros.</EmptyState></div> : view === 'lista' && isMobile ? (
        <div className="mcards stagger">
          {rows.map((o) => {
            const dias = o.situacion !== 'Cerrada' ? diasDesde(o.aperturaISO) : null
            const tone = situTone(o.situacion)
            return (
              <button key={o.id} className={`mcard acc-${tone} ${selection.has(o.id) ? 'selected' : ''}`} onClick={() => (selection.on ? selection.toggle(o.id) : setSel(o))}>
                {selection.on ? <SelectBox checked={selection.has(o.id)} /> : <IconTile icon={iconOS(o.tipo)} tone={tone} size={42} />}
                <div className="mc-body">
                  <div className="mc-title">{clean(o.titulo)}</div>
                  <div className="mc-sub">{o.numero} · {o.taller}</div>
                  <div className="mc-chips">
                    <Badge tone={tone}>{o.situacion}</Badge>
                    {o.origen === 'Portal' && <Badge tone="accent">Cliente</Badge>}
                  </div>
                </div>
                <div className="mc-right">
                  {dias != null && <span className="big mono" style={{ color: dias > 100 ? 'var(--danger)' : undefined }}>{dias}d</span>}
                  <span className="faint small">{fecha(o.aperturaISO)}</span>
                </div>
              </button>
            )
          })}
        </div>
      ) : view === 'lista' ? (
        <div className="card">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>OS</th><th>Título</th><th>Tipo</th><th>Situación</th><th>Taller</th><th className="num">Días</th></tr></thead>
              <tbody>
                {rows.map((o) => {
                  const dias = o.situacion !== 'Cerrada' ? diasDesde(o.aperturaISO) : null
                  return (
                    <tr key={o.id} className={selection.has(o.id) ? 'selected' : ''} onClick={() => (selection.on ? selection.toggle(o.id) : setSel(o))}>
                      <td><span className="mono small">{o.numero}</span><div className="faint small">{fecha(o.aperturaISO)}</div></td>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{selection.on ? <SelectBox checked={selection.has(o.id)} /> : <IconTile icon={iconOS(o.tipo)} tone={situTone(o.situacion)} size={34} />}<div><div className="row-strong">{clean(o.titulo)}</div><div className="faint small">{clean(o.descripcion)}</div></div></div></td>
                      <td>{o.tipo}</td>
                      <td><Badge tone={situTone(o.situacion)}>{o.situacion}</Badge></td>
                      <td>{o.taller}</td>
                      <td className="num mono" style={{ color: dias != null && dias > 100 ? 'var(--danger)' : undefined }}>{dias ?? '—'}</td>
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

      {selection.on && (
        <SelectionBar count={selection.size} total={rows.length}
          onAll={() => selection.selectMany(rows.map((o) => o.id))}
          onClear={selection.clear}
          onCsv={() => exportCsv('ordenes-seleccion.csv', rows.filter((o) => selection.has(o.id)).map((o) => ({ OS: o.numero, Titulo: clean(o.titulo), Tipo: o.tipo, Situacion: o.situacion, Taller: o.taller, Tecnico: o.tecnico, Apertura: fecha(o.aperturaISO) })))}
          onImg={() => shareSelectionImage({ title: 'Órdenes de servicio', subtitle: cliente?.nombre, filename: 'ordenes-sgem.png', items: rows.filter((o) => selection.has(o.id)).map((o) => ({ titulo: clean(o.titulo), lineas: [`${o.numero} · ${o.situacion}`, `${o.taller} · ${o.tecnico}`, `Apertura ${fecha(o.aperturaISO)}`] })) })}
        />
      )}

      {current && <Detalle orden={current} onClose={() => setSel(null)} puedeEditar={puedeEditar} />}
      {nueva && <NuevaOS clienteId={clienteId} onClose={() => setNueva(false)} onCreated={(o) => { setNueva(false); setSel(o) }} />}
    </Page>
  )
}

function Detalle({ orden, onClose, puedeEditar }: { orden: OrdenServicio; onClose: () => void; puedeEditar: boolean }) {
  const { db, addAccion, addTarea, updateAccion, emitirCertificado, updateOrden } = useStore()
  const equipo = db.equipos.find((e) => e.id === orden.equipoId) ?? null
  const cliente = db.clientes.find((c) => c.id === orden.clienteId)!
  const tecnicos = useMemo(() => [...new Set([orden.tecnico, ...db.ordenes.map((o) => o.tecnico)].filter((t) => t && t !== 'sistema'))].sort(), [db.ordenes, orden.tecnico])
  const [nota, setNota] = useState('')
  const [tareaResp, setTareaResp] = useState('')
  const [tareaVence, setTareaVence] = useState('')
  const [firmando, setFirmando] = useState(false)
  const [firma, setFirma] = useState('')
  const [firmante, setFirmante] = useState('')
  // emisión de certificado
  const certCount = useMemo(() => db.ordenes.filter((o) => o.certificado).length, [db.ordenes])
  const [emitiendo, setEmitiendo] = useState(false)
  const [certNro, setCertNro] = useState('')
  const [certMeses, setCertMeses] = useState(12)
  const [certFirma, setCertFirma] = useState('')
  const [certFirmante, setCertFirmante] = useState('')
  const agregarTarea = () => {
    if (!nota.trim()) return
    addTarea(orden.id, { nota: nota.trim(), responsable: tareaResp || undefined, venceISO: tareaVence ? new Date(tareaVence + 'T12:00:00').toISOString() : undefined })
    setNota(''); setTareaResp(''); setTareaVence('')
  }
  const ESTADO_NEXT: Record<EstadoTarea, EstadoTarea> = { pendiente: 'en_curso', en_curso: 'hecha', hecha: 'pendiente' }
  const abrirEmision = () => { setCertNro(`CERT-${new Date().getFullYear()}-${String(certCount + 1).padStart(4, '0')}`); setCertMeses(12); setCertFirma(''); setCertFirmante(''); setEmitiendo(true) }
  const confirmarEmision = () => {
    if (!equipo || !certNro.trim()) return
    const cert = emitirCertificado(orden.id, equipo.id, { numero: certNro.trim(), meses: certMeses, firmaDataUrl: certFirma || undefined, firmante: certFirmante || undefined, norma: orden.protocolo?.norma })
    setEmitiendo(false)
    certificadoPDF(equipo, cliente, cert.numero, cert.vencimientoISO)
  }
  const fileRef = useRef<HTMLInputElement>(null)
  const fotos = orden.fotosData ?? []

  const onFiles = (files: FileList | null) => {
    if (!files) return
    const list = [...files].slice(0, 6)
    let pending = list.length
    const nuevas: string[] = []
    for (const f of list) {
      const r = new FileReader()
      r.onload = () => {
        nuevas.push(String(r.result))
        if (--pending === 0) {
          updateOrden(orden.id, { fotosData: [...fotos, ...nuevas].slice(0, 12) })
          addAccion(orden.id, `Adjuntó ${nuevas.length} foto(s).`)
        }
      }
      r.readAsDataURL(f)
    }
  }
  const quitarFoto = (i: number) => updateOrden(orden.id, { fotosData: fotos.filter((_, j) => j !== i) })

  const [protoAbierto, setProtoAbierto] = useState(false)
  const [proto, setProto] = useState<Protocolo | null>(orden.protocolo ?? null)
  const iniciarProto = () => {
    const t = plantillaProtocolo(equipo)
    setProto({ tipo: 'Protocolo de ensayo', norma: t.norma, items: t.items, realizadoPor: orden.tecnico, fechaISO: new Date().toISOString(), resultado: 'OBSERVADO' })
    setProtoAbierto(true)
  }
  const setItem = (i: number, patch: Partial<Protocolo['items'][number]>) => {
    setProto((p) => p ? { ...p, items: p.items.map((it, j) => j === i ? { ...it, ...patch } : it) } : p)
  }
  const guardarProto = () => {
    if (!proto) return
    const faltan = proto.items.some((it) => it.ok === null)
    const resultado = proto.items.some((it) => it.ok === false) ? 'NO APTO' : faltan ? 'OBSERVADO' : 'APTO'
    const fin = { ...proto, resultado: resultado as Protocolo['resultado'] }
    updateOrden(orden.id, { protocolo: fin })
    addAccion(orden.id, `Protocolo de ensayo completado · resultado ${resultado}.`)
    setProto(fin); setProtoAbierto(false)
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <div><div className="faint small mono">{orden.numero}</div><h3 style={{ fontSize: 17 }}>{clean(orden.titulo)}</h3></div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="drawer-body">
          {(() => { const Ic = iconOS(orden.tipo); const ht = situTone(orden.situacion); return (
            <div className={`hero ht-${ht}`}>
              <span className="h-ic"><Ic size={28} /></span>
              <div className="h-body">
                <div className="h-kicker">{orden.numero} · {orden.tipo}</div>
                <div className="h-title">{clean(orden.titulo)}</div>
                <div className="h-sub">{orden.taller} · {orden.tecnico}</div>
              </div>
            </div>
          ) })()}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Badge tone={situTone(orden.situacion)}>{orden.situacion}</Badge>
            <Badge tone={orden.criticidad === 'ALTA' ? 'danger' : orden.criticidad === 'MEDIA' ? 'warn' : 'neutral'}>{orden.criticidad}</Badge>
            <Badge>{orden.tipo}</Badge>
            {orden.origen === 'Portal' && <Badge tone="accent">Solicitud del cliente</Badge>}
          </div>

          {puedeEditar && (
            <div className="grid-2" style={{ gap: 12 }}>
              <div className="field">
                <label>Situación</label>
                <select value={orden.situacion} onChange={(e) => { const s = e.target.value as SituacionOS; updateOrden(orden.id, { situacion: s, cierreISO: s === 'Cerrada' ? new Date().toISOString() : null }) }}>
                  {SITU.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Programar visita</label>
                <input type="date" value={orden.programadaISO ? orden.programadaISO.slice(0, 10) : ''} onChange={(e) => updateOrden(orden.id, { programadaISO: e.target.value ? new Date(e.target.value + 'T09:00:00').toISOString() : undefined })} />
              </div>
              <div className="field">
                <label>Técnico asignado</label>
                <select value={orden.tecnico} onChange={(e) => updateOrden(orden.id, { tecnico: e.target.value })}>
                  {tecnicos.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="card pad">
            <Row k="Equipo" v={equipo ? `${equipo.tipo} · ${equipo.fabricante} ${equipo.modelo}` : '—'} />
            {equipo && <Row k="Serie / QR" v={`${equipo.serie} · ${equipo.qr}`} />}
            <Row k="Taller" v={orden.taller} /><Row k="Técnico" v={orden.tecnico} /><Row k="Apertura" v={fecha(orden.aperturaISO)} />
            {orden.descripcion && <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}><span className="faint small">Descripción</span><div>{clean(orden.descripcion)}</div></div>}
          </div>

          <div>
            <b style={{ fontSize: 14, display: 'block', marginBottom: 10 }}>Acciones y tareas</b>
            {puedeEditar && (
              <div className="tarea-add">
                <input className="search" placeholder="Nueva tarea o acción…" value={nota} onChange={(e) => setNota(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') agregarTarea() }} />
                <div className="tarea-add-row">
                  <select className="sel" value={tareaResp} onChange={(e) => setTareaResp(e.target.value)}><option value="">Responsable…</option>{tecnicos.map((t) => <option key={t}>{t}</option>)}</select>
                  <input className="sel" type="date" value={tareaVence} onChange={(e) => setTareaVence(e.target.value)} title="Fecha límite" />
                  <button className="btn primary sm" disabled={!nota.trim()} onClick={agregarTarea}><Plus size={15} /> Agregar</button>
                </div>
              </div>
            )}
            <ul className="tasks">
              {orden.acciones.map((a) => (a.tipo === 'tarea' ? (
                <li key={a.id} className={`task est-${a.estado}`}>
                  <button className="task-check" disabled={!puedeEditar} onClick={() => updateAccion(orden.id, a.id, { estado: ESTADO_NEXT[a.estado ?? 'pendiente'] })} title="Cambiar estado" aria-label="Cambiar estado">
                    {a.estado === 'hecha' ? <CheckCircle2 size={20} /> : a.estado === 'en_curso' ? <CircleDot size={20} /> : <Circle size={20} />}
                  </button>
                  <div className="task-body">
                    <div className="task-t">{a.nota}</div>
                    <div className="task-meta">
                      {a.responsable && <span className="task-chip"><UserRound size={12} /> {a.responsable}</span>}
                      {a.venceISO && (() => { const d = diasHasta(a.venceISO) ?? 0; const bad = d < 0 && a.estado !== 'hecha'; return <span className={`task-chip ${bad ? 'bad' : ''}`}><Clock size={12} /> {fecha(a.venceISO)}{bad ? ` · vencida` : ''}</span> })()}
                      <span className="task-chip faint">{a.usuario}</span>
                    </div>
                  </div>
                </li>
              ) : (
                <li key={a.id} className="task note">
                  <span className="task-dot" />
                  <div className="task-body"><div className="task-t">{a.nota}</div><div className="task-meta"><span className="task-chip faint">{fecha(a.fechaISO)} · {a.usuario}</span></div></div>
                </li>
              )))}
            </ul>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <b style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}><ClipboardCheck size={15} style={{ color: 'var(--brand)' }} /> Protocolo de ensayo</b>
              {proto && !protoAbierto && <Badge tone={proto.resultado === 'APTO' ? 'ok' : proto.resultado === 'NO APTO' ? 'danger' : 'warn'}>{proto.resultado}</Badge>}
            </div>
            {!proto && !protoAbierto && (
              puedeEditar ? <button className="btn secondary sm" onClick={iniciarProto}><ClipboardCheck size={15} /> Iniciar protocolo</button>
                : <span className="faint small">Sin protocolo cargado.</span>
            )}
            {proto && !protoAbierto && (
              <div className="card pad" style={{ display: 'grid', gap: 8 }}>
                <div className="faint small">{proto.norma} · {proto.realizadoPor}</div>
                {proto.items.map((it, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
                    <span style={{ flex: 1 }}>{it.label}</span>
                    <span className="faint mono">{it.valor || '—'}</span>
                    <Badge tone={it.ok ? 'ok' : it.ok === false ? 'danger' : 'neutral'}>{it.ok ? 'Apto' : it.ok === false ? 'No apto' : 'N/A'}</Badge>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {puedeEditar && <button className="btn ghost sm" onClick={() => setProtoAbierto(true)}>Editar</button>}
                  <button className="btn secondary sm" onClick={() => informeEnsayoPDF(orden, equipo, cliente, proto)}><Download size={14} /> Informe de ensayo PDF</button>
                </div>
              </div>
            )}
            {proto && protoAbierto && (
              <div className="card pad" style={{ display: 'grid', gap: 10 }}>
                <div className="faint small">{proto.norma}</div>
                {proto.items.map((it, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 86px auto', gap: 8, alignItems: 'center' }}>
                    <div><div style={{ fontSize: 12.5, fontWeight: 500 }}>{it.label}</div><div className="faint" style={{ fontSize: 11 }}>Límite {it.limite}</div></div>
                    <input className="search" style={{ height: 32, padding: '0 8px' }} placeholder="Medido" value={it.valor} onChange={(e) => setItem(i, { valor: e.target.value })} />
                    <div className="seg">
                      <button className={it.ok === true ? 'on' : ''} onClick={() => setItem(i, { ok: true })} title="Apto">✓</button>
                      <button className={it.ok === false ? 'on' : ''} onClick={() => setItem(i, { ok: false })} title="No apto">✕</button>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn ghost sm" onClick={() => setProtoAbierto(false)}>Cancelar</button>
                  <button className="btn primary sm" onClick={guardarProto}>Guardar protocolo</button>
                </div>
              </div>
            )}
          </div>

          {equipo && (orden.protocolo?.resultado === 'APTO' || orden.certificado) && (
            <div>
              <b style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}><Award size={15} style={{ color: 'var(--brand)' }} /> Certificación</b>
              {orden.certificado ? (
                <div className="cert-card">
                  <div className="cert-top">
                    <span className="cert-ic"><Award size={22} /></span>
                    <div className="cert-ttl"><b>Certificado N° {orden.certificado.numero}</b><span>{orden.certificado.norma}</span></div>
                    <Badge tone="ok">Vigente</Badge>
                  </div>
                  <div className="cert-rows">
                    <Row k="Emitido" v={fecha(orden.certificado.fechaISO)} />
                    <Row k="Vigente hasta" v={fecha(orden.certificado.vencimientoISO)} />
                    {orden.certificado.firmante && <Row k="Firmado por" v={orden.certificado.firmante} />}
                  </div>
                  <button className="btn secondary sm" style={{ marginTop: 10 }} onClick={() => certificadoPDF(equipo, cliente, orden.certificado!.numero, orden.certificado!.vencimientoISO)}><Download size={14} /> Descargar certificado PDF</button>
                </div>
              ) : emitiendo ? (
                <div className="card pad" style={{ display: 'grid', gap: 12 }}>
                  <div className="faint small">El protocolo dio <b style={{ color: 'var(--ok)' }}>APTO</b>. Emití el certificado: se genera el PDF y se actualiza la vigencia del equipo.</div>
                  <div className="grid-2" style={{ gap: 12 }}>
                    <div className="field"><label>N° de certificado</label><input value={certNro} onChange={(e) => setCertNro(e.target.value)} /></div>
                    <div className="field"><label>Vigencia</label><select value={certMeses} onChange={(e) => setCertMeses(Number(e.target.value))}><option value={6}>6 meses</option><option value={12}>12 meses</option><option value={24}>24 meses</option></select></div>
                  </div>
                  <div className="field"><label>Responsable que firma (opcional)</label><input value={certFirmante} onChange={(e) => setCertFirmante(e.target.value)} placeholder="Ing. responsable" /></div>
                  <Signature onChange={setCertFirma} />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn ghost sm" onClick={() => setEmitiendo(false)}>Cancelar</button>
                    <button className="btn primary sm" disabled={!certNro.trim()} onClick={confirmarEmision}><Award size={15} /> Emitir y descargar</button>
                  </div>
                </div>
              ) : (
                puedeEditar
                  ? <button className="btn primary sm" onClick={abrirEmision}><Award size={15} /> Emitir certificado</button>
                  : <span className="faint small">Protocolo APTO. Pendiente de emisión del certificado.</span>
              )}
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <b style={{ fontSize: 14 }}>Fotos {fotos.length > 0 && <span className="faint small">({fotos.length})</span>}</b>
              {puedeEditar && <button className="btn secondary sm" onClick={() => fileRef.current?.click()}><Camera size={15} /> Agregar</button>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} />
            {fotos.length === 0 ? <span className="faint small">Sin fotos. {puedeEditar && 'Sacá o adjuntá fotos del equipo o del trabajo.'}</span> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px,1fr))', gap: 8 }}>
                {fotos.map((src, i) => (
                  <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <img src={src} alt={`foto ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {puedeEditar && <button className="icon-btn" onClick={() => quitarFoto(i)} style={{ position: 'absolute', top: 2, right: 2, width: 24, height: 24, background: 'rgba(0,0,0,.55)', color: '#fff' }}><Trash2 size={13} /></button>}
                  </div>
                ))}
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
