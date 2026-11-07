import { useMemo, useState } from 'react'
import { Bell, Mail, Plus, Send, X } from 'lucide-react'
import { Page } from '../components/Layout'
import RequireCliente from '../components/RequireCliente'
import { Badge, EmptyState } from '../components/ui'
import { useAlertas, useStore } from '../lib/store'
import { fecha } from '../lib/format'

const CFG_KEY = 'sgem.plus.notis'
interface Cfg { anticipacion: number; destinatarios: string[] }
function loadCfg(): Cfg {
  try { const r = localStorage.getItem(CFG_KEY); if (r) return JSON.parse(r) } catch { /* ignore */ }
  return { anticipacion: 30, destinatarios: ['gestion@biotrust.com.ar'] }
}

function Notificaciones({ clienteId }: { clienteId: number }) {
  const { db, cliente, log } = useStore()
  const alertas = useAlertas(clienteId)
  const [cfg, setCfg] = useState<Cfg>(loadCfg)
  const [nuevo, setNuevo] = useState('')
  const [preview, setPreview] = useState(false)

  const saveCfg = (c: Cfg) => { setCfg(c); try { localStorage.setItem(CFG_KEY, JSON.stringify(c)) } catch { /* ignore */ } }
  const addDest = () => { const e = nuevo.trim(); if (e && !cfg.destinatarios.includes(e)) { saveCfg({ ...cfg, destinatarios: [...cfg.destinatarios, e] }); setNuevo('') } }

  const resumen = useMemo(() => {
    const dentro = alertas.filter((a) => {
      const d = (new Date(a.vencimientoISO).getTime() - Date.now()) / 86400000
      return d <= cfg.anticipacion
    })
    return {
      vencidos: dentro.filter((a) => a.estado === 'VENCIDO'),
      porVencer: dentro.filter((a) => a.estado === 'POR_VENCER'),
      total: dentro.length,
    }
  }, [alertas, cfg.anticipacion])

  const historial = db.auditoria.filter((a) => a.accion === 'Notificación')

  const enviar = () => {
    log('Notificación', `Resumen de vencimientos de ${cliente?.nombre} a ${cfg.destinatarios.length} destinatario(s): ${resumen.vencidos.length} vencidos, ${resumen.porVencer.length} por vencer.`)
    setPreview(false)
  }

  return (
    <Page title="Notificaciones" sub={`${cliente?.nombre} · avisos de vencimiento por mail`}
      actions={<button className="btn primary" onClick={() => setPreview(true)} disabled={!resumen.total}><Send size={16} /> Enviar resumen ahora</button>}>
      <div className="grid-2">
        <div className="card">
          <div className="card-head"><h3>Configuración de alertas</h3></div>
          <div className="card-body" style={{ display: 'grid', gap: 18 }}>
            <div className="field">
              <label>Avisar con anticipación</label>
              <div className="filters">
                {[15, 30, 60, 90].map((d) => (
                  <button key={d} className={`chip ${cfg.anticipacion === d ? 'on' : ''}`} onClick={() => saveCfg({ ...cfg, anticipacion: d })}>{d} días</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Destinatarios</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {cfg.destinatarios.map((e) => (
                  <span key={e} className="chip">{e}<button className="icon-btn" style={{ width: 18, height: 18 }} onClick={() => saveCfg({ ...cfg, destinatarios: cfg.destinatarios.filter((x) => x !== e) })}><X size={12} /></button></span>
                ))}
                {cfg.destinatarios.length === 0 && <span className="faint small">Agregá al menos un correo.</span>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="search" style={{ flex: 1 }} placeholder="correo@ejemplo.com" value={nuevo} onChange={(e) => setNuevo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addDest()} />
                <button className="btn secondary" onClick={addDest}><Plus size={16} /></button>
              </div>
            </div>
            <div className="card pad" style={{ background: 'var(--surface-2)', display: 'flex', gap: 10, alignItems: 'center' }}>
              <Bell size={18} style={{ color: 'var(--brand)' }} />
              <span className="small muted">Se envía un resumen automático cada lunes y un aviso cuando un vencimiento entra en la ventana de {cfg.anticipacion} días.</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Vista previa del mail</h3><Badge tone={resumen.vencidos.length ? 'danger' : 'ok'}>{resumen.total} ítems</Badge></div>
          <div className="card-body">
            <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg,var(--brand-2),var(--brand-3))', color: '#fff', padding: '16px 18px' }}>
                <div style={{ fontFamily: 'var(--ff-d)', fontWeight: 800, fontSize: 18 }}>SGEM Plus · Vencimientos</div>
                <div style={{ opacity: .85, fontSize: 13 }}>{cliente?.nombre}</div>
              </div>
              <div style={{ padding: 16, display: 'grid', gap: 10 }}>
                <p className="small muted" style={{ margin: 0 }}>Hola equipo, este es el estado del equipamiento para los próximos {cfg.anticipacion} días:</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 9, padding: 10, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--ff-d)', fontWeight: 800, fontSize: 22, color: 'var(--danger)' }}>{resumen.vencidos.length}</div>
                    <div className="faint small">Vencidos</div>
                  </div>
                  <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 9, padding: 10, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--ff-d)', fontWeight: 800, fontSize: 22, color: 'var(--warn)' }}>{resumen.porVencer.length}</div>
                    <div className="faint small">Por vencer</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 5 }}>
                  {[...resumen.vencidos, ...resumen.porVencer].slice(0, 5).map((a, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, paddingBottom: 5, borderBottom: '1px solid var(--border)' }}>
                      <span>{a.tipo} · {a.equipo}</span>
                      <span className="mono faint">{fecha(a.vencimientoISO)}</span>
                    </div>
                  ))}
                  {resumen.total > 5 && <span className="faint small">y {resumen.total - 5} más…</span>}
                  {resumen.total === 0 && <span className="faint small">Todo al día. Sin vencimientos en la ventana.</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Historial de envíos</h3><span className="faint small">{historial.length}</span></div>
        {historial.length === 0 ? <EmptyState icon={<Mail size={22} />}>Todavía no se enviaron notificaciones.</EmptyState> : (
          <div className="tbl-wrap">
            <table className="tbl"><tbody>
              {historial.map((h) => (
                <tr key={h.id} style={{ cursor: 'default' }}>
                  <td className="mono small faint" style={{ whiteSpace: 'nowrap' }}>{fecha(h.fechaISO)} {new Date(h.fechaISO).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{h.detalle}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
        )}
      </div>

      {preview && (
        <>
          <div className="scrim" onClick={() => setPreview(false)} />
          <div className="modal" onClick={() => setPreview(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="drawer-head"><h3 style={{ fontSize: 17 }}>Enviar resumen por mail</h3><button className="icon-btn" onClick={() => setPreview(false)}><X size={18} /></button></div>
              <div style={{ padding: 20, display: 'grid', gap: 12 }}>
                <p className="muted" style={{ margin: 0 }}>Se enviará el resumen de <b>{resumen.total}</b> vencimientos de <b>{cliente?.nombre}</b> a:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{cfg.destinatarios.map((e) => <span key={e} className="chip">{e}</span>)}</div>
              </div>
              <div className="drawer-foot"><button className="btn ghost" onClick={() => setPreview(false)}>Cancelar</button><button className="btn primary" onClick={enviar} disabled={!cfg.destinatarios.length}><Send size={16} /> Enviar</button></div>
            </div>
          </div>
        </>
      )}
    </Page>
  )
}

export default function NotificacionesPage() {
  return <RequireCliente>{(id) => <Notificaciones clienteId={id} />}</RequireCliente>
}
