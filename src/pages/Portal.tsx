import { useMemo, useState } from 'react'
import { BadgeCheck, Building2, Download, Eye, Plus, ShieldCheck, Stethoscope, X } from 'lucide-react'
import { Page } from '../components/Layout'
import RequireCliente from '../components/RequireCliente'
import { Badge, EmptyState, Kpi, VigBadge } from '../components/ui'
import { useStore } from '../lib/store'
import { certificadoPDF } from '../lib/pdf'
import { fecha, pct, vigencia } from '../lib/format'

function SolicitudModal({ clienteId, onClose }: { clienteId: number; onClose: () => void }) {
  const { db, addOrden, user } = useStore()
  const equipos = db.equipos.filter((e) => e.clienteId === clienteId && e.estado !== 'BAJA')
  const [equipoId, setEquipoId] = useState('')
  const [desc, setDesc] = useState('')
  const [enviada, setEnviada] = useState(false)
  const eq = equipos.find((e) => String(e.id) === equipoId)
  const enviar = () => {
    addOrden({
      clienteId, equipoId: eq?.id ?? null,
      servicioId: eq?.servicioId ?? db.servicios.find((s) => s.clienteId === clienteId)!.id,
      tipo: 'Reparación', titulo: `Solicitud: ${eq ? `${eq.tipo} ${eq.fabricante}` : 'Equipo'}`,
      descripcion: desc, criticidad: 'MEDIA', situacion: 'Abierta', taller: db.talleres[0],
      tecnico: user?.username ?? 'cliente', origen: 'Portal',
    })
    setEnviada(true)
  }
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" onClick={onClose}>
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-head"><h3 style={{ fontSize: 17 }}>Solicitar un servicio</h3><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
          {enviada ? (
            <div style={{ padding: 28, textAlign: 'center', display: 'grid', gap: 10, justifyItems: 'center' }}>
              <span style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--ok-soft)', color: 'var(--ok)', display: 'grid', placeItems: 'center' }}><BadgeCheck size={26} /></span>
              <h3 style={{ fontSize: 18 }}>¡Solicitud enviada!</h3>
              <p className="muted" style={{ maxWidth: '36ch' }}>Biotrust recibió tu pedido y lo verá como una orden de servicio nueva. Te vamos a contactar a la brevedad.</p>
              <button className="btn primary" onClick={onClose} style={{ marginTop: 6 }}>Listo</button>
            </div>
          ) : (
            <>
              <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                <div className="field"><label>Equipo</label><select value={equipoId} onChange={(e) => setEquipoId(e.target.value)}><option value="">Sin equipo específico</option>{equipos.map((e) => <option key={e.id} value={e.id}>{e.tipo} · {e.fabricante} {e.modelo} · {e.serie}</option>)}</select></div>
                <div className="field"><label>¿Qué necesitás?</label><textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Describí la falla o el servicio que necesitás…" /></div>
              </div>
              <div className="drawer-foot"><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={enviar} disabled={!desc.trim()}>Enviar solicitud</button></div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function Portal({ clienteId }: { clienteId: number }) {
  const { db, user } = useStore()
  const cliente = db.clientes.find((c) => c.id === clienteId)!
  const esVistaInterna = user?.rol !== 'CLIENTE'
  const [solicitar, setSolicitar] = useState(false)

  const d = useMemo(() => {
    const equipos = db.equipos.filter((e) => e.clienteId === clienteId && e.estado !== 'BAJA')
    const eqIds = new Set(equipos.map((e) => e.id))
    const certs = db.certificaciones.filter((c) => eqIds.has(c.equipoId))
    const vig = certs.filter((c) => vigencia(c.vencimientoISO) === 'VIGENTE').length
    const conCert = equipos.filter((e) => e.certificable)
    return { equipos, certs, vig, conCert }
  }, [db, clienteId])

  return (
    <Page title="Portal del cliente" sub={esVistaInterna ? 'Vista de lo que ve el cliente (solo lectura)' : undefined}
      actions={!esVistaInterna ? <button className="btn primary" onClick={() => setSolicitar(true)}><Plus size={16} /> Solicitar servicio</button> : undefined}>
      {esVistaInterna && (
        <div className="card pad" style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--brand-soft)', borderColor: 'transparent' }}>
          <Eye size={18} style={{ color: 'var(--brand)' }} />
          <span style={{ color: 'var(--brand)', fontWeight: 500 }}>Estás viendo el portal tal como lo ve <b>{cliente.nombre}</b>. El cliente solo accede a su propio equipamiento, en modo lectura.</span>
        </div>
      )}

      <div className="card pad" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ width: 56, height: 56, borderRadius: 14, background: cliente.color, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: 'var(--ff-d)', fontWeight: 800, fontSize: 18 }}>{cliente.corto.slice(0, 3)}</span>
        <div>
          <h2 style={{ fontSize: 20 }}>{cliente.nombre}</h2>
          <div className="faint small">{cliente.direccion} · CUIT {cliente.cuit}</div>
        </div>
        <span className="badge tone-ok" style={{ marginLeft: 'auto' }}><Building2 size={13} /> Portal activo</span>
      </div>

      <div className="kpi-row">
        <Kpi label="Equipos" value={d.equipos.length} tone="brand" icon={<Stethoscope size={18} />} />
        <Kpi label="Operativos" value={`${pct(d.equipos.filter((e) => e.estado === 'OPERATIVO').length, d.equipos.length)}%`} tone="ok" icon={<BadgeCheck size={18} />} />
        <Kpi label="Certificaciones vigentes" value={`${pct(d.vig, d.conCert.length)}%`} tone="info" icon={<ShieldCheck size={18} />} />
        <Kpi label="Certificados disponibles" value={d.certs.length} tone="accent" icon={<Download size={18} />} />
      </div>

      <div className="card">
        <div className="card-head"><h3>Mi equipamiento y certificados</h3><span className="faint small">{d.equipos.length} equipos</span></div>
        {d.equipos.length === 0 ? <EmptyState /> : (
          <div className="tbl-wrap">
            <table className="tbl cards">
              <thead><tr><th>Equipo</th><th>Serie</th><th>Estado</th><th>Certificación</th><th>Certificado</th></tr></thead>
              <tbody>
                {d.equipos.slice(0, 60).map((e) => {
                  const cert = d.certs.find((c) => c.equipoId === e.id)
                  return (
                    <tr key={e.id}>
                      <td data-label="Equipo"><div className="row-strong">{e.tipo}</div><div className="faint small">{e.fabricante} {e.modelo}</div></td>
                      <td data-label="Serie" className="mono small">{e.serie}</td>
                      <td data-label="Estado"><Badge tone={e.estado === 'OPERATIVO' ? 'ok' : e.estado === 'EN TALLER' ? 'warn' : 'danger'} dot>{e.estado}</Badge></td>
                      <td data-label="Certificación">{cert ? <VigBadge estado={vigencia(cert.vencimientoISO)} /> : <span className="faint small">No aplica</span>}{cert && <div className="faint small">vence {fecha(cert.vencimientoISO)}</div>}</td>
                      <td data-label="Certificado">{cert ? <button className="btn secondary sm" onClick={() => certificadoPDF(e, cliente, cert.numero, cert.vencimientoISO)}><Download size={14} /> PDF</button> : <span className="faint small">—</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {solicitar && <SolicitudModal clienteId={clienteId} onClose={() => setSolicitar(false)} />}
    </Page>
  )
}

export default function PortalPage() {
  return <RequireCliente>{(id) => <Portal clienteId={id} />}</RequireCliente>
}
