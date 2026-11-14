import { useMemo, useState } from 'react'
import { Mail, Plus, Send, X } from 'lucide-react'
import { Page } from '../components/Layout'
import RequireCliente from '../components/RequireCliente'
import { EmptyState } from '../components/ui'
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
      <div className="nt-grid">
        <section className="nt">
          <div className="rp-top"><span>Regla de aviso</span><span><b>{cfg.anticipacion}</b> días antes</span></div>
          <div className="nt-regla" role="radiogroup" aria-label="Anticipación del aviso">
            {[15, 30, 60, 90].map((d) => (
              <button key={d} role="radio" aria-checked={cfg.anticipacion === d} className={`${cfg.anticipacion === d ? 'on' : ''} ${d <= cfg.anticipacion ? 'in' : ''}`} onClick={() => saveCfg({ ...cfg, anticipacion: d })}><i /><b>{d}</b><small>días</small></button>
            ))}
          </div>
          <p className="nt-note">Resumen automático cada lunes y aviso cuando un vencimiento entra en la ventana de {cfg.anticipacion} días.</p>

          <div className="rp-top" style={{ marginTop: 26 }}><span>Destinatarios</span><span><b>{cfg.destinatarios.length}</b></span></div>
          <ol className="nt-dest">
            {cfg.destinatarios.map((e, i) => (
              <li key={e}><em>{String(i + 1).padStart(2, '0')}</em><span>{e}</span><button className="icon-btn" aria-label={`Quitar ${e}`} onClick={() => saveCfg({ ...cfg, destinatarios: cfg.destinatarios.filter((x) => x !== e) })}><X size={14} /></button></li>
            ))}
            {cfg.destinatarios.length === 0 && <li className="vacio">Agregá al menos un correo.</li>}
          </ol>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input className="search" style={{ flex: 1 }} placeholder="correo@ejemplo.com" value={nuevo} onChange={(e) => setNuevo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addDest()} />
            <button className="btn secondary" onClick={addDest} aria-label="Agregar destinatario"><Plus size={16} /></button>
          </div>
        </section>

        <section className="nt">
          <div className="rp-top"><span>Así llega el mail</span><span><b>{resumen.total}</b> ítems</span></div>
          <article className="nt-mail">
            <dl>
              <dt>De</dt><dd>SGEM Plus · avisos</dd>
              <dt>Para</dt><dd>{cfg.destinatarios.join(', ') || '—'}</dd>
              <dt>Asunto</dt><dd>Vencimientos · {cliente?.nombre}</dd>
            </dl>
            <h4>Parte de vencimientos</h4>
            <p>Estado del equipamiento de {cliente?.nombre} para los próximos {cfg.anticipacion} días.</p>
            <div className="nt-nums">
              <div className="d"><b>{resumen.vencidos.length}</b><span>Vencidos</span></div>
              <div className="w"><b>{resumen.porVencer.length}</b><span>Por vencer</span></div>
            </div>
            <ul>
              {[...resumen.vencidos, ...resumen.porVencer].slice(0, 5).map((a, i) => (
                <li key={i}><i className={a.estado === 'VENCIDO' ? 'd' : 'w'} /><span>{a.tipo} · {a.equipo}</span><time>{fecha(a.vencimientoISO)}</time></li>
              ))}
              {resumen.total > 5 && <li className="mas">y {resumen.total - 5} más en el informe adjunto</li>}
              {resumen.total === 0 && <li className="mas">Todo al día. Sin vencimientos en la ventana.</li>}
            </ul>
          </article>
        </section>
      </div>

      <section className="nt">
        <div className="rp-top"><span>Historial de envíos</span><span><b>{historial.length}</b></span></div>
        {historial.length === 0 ? <EmptyState icon={<Mail size={22} />}>Todavía no se enviaron notificaciones.</EmptyState> : (
          <ol className="nt-hist">
            {historial.map((h) => (
              <li key={h.id}><time>{fecha(h.fechaISO)} · {new Date(h.fechaISO).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}</time><span>{h.detalle}</span></li>
            ))}
          </ol>
        )}
      </section>

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
