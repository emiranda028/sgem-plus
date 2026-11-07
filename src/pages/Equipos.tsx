import { useMemo, useState } from 'react'
import { ChevronRight, Download, Printer, QrCode, Search, Stethoscope, X } from 'lucide-react'
import { Page } from '../components/Layout'
import RequireCliente from '../components/RequireCliente'
import { Badge, EmptyState, EstadoBadge, VigBadge } from '../components/ui'
import { Qr } from '../components/Qr'
import { useStore } from '../lib/store'
import { certificadoPDF } from '../lib/pdf'
import { exportCsv } from '../lib/csv'
import { clean, fecha, normalize, vigencia } from '../lib/format'
import type { Equipo } from '../lib/types'

const PAGE = 40

function Lista({ clienteId, readOnly }: { clienteId: number; readOnly?: boolean }) {
  const { db, cliente } = useStore()
  const [q, setQ] = useState('')
  const [servicio, setServicio] = useState('')
  const [tipo, setTipo] = useState('')
  const [estado, setEstado] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [sel, setSel] = useState<Equipo | null>(null)

  const equipos = useMemo(() => db.equipos.filter((e) => e.clienteId === clienteId), [db.equipos, clienteId])
  const servicios = useMemo(() => new Map(db.servicios.map((s) => [s.id, s.nombre])), [db.servicios])

  const opts = useMemo(() => {
    const s = new Map<number, string>(), t = new Set<string>(), es = new Set<string>()
    for (const e of equipos) { s.set(e.servicioId, servicios.get(e.servicioId) ?? ''); t.add(e.tipo); es.add(e.estado) }
    return {
      servicios: [...s].sort((a, b) => a[1].localeCompare(b[1])),
      tipos: [...t].sort(),
      estados: [...es].sort(),
    }
  }, [equipos, servicios])

  const rows = useMemo(() => {
    const n = normalize(q)
    return equipos.filter((e) => {
      if (servicio && String(e.servicioId) !== servicio) return false
      if (tipo && e.tipo !== tipo) return false
      if (estado && e.estado !== estado) return false
      if (!n) return true
      return normalize(`${e.tipo} ${e.fabricante} ${e.modelo} ${e.serie} ${e.qr} ${servicios.get(e.servicioId)}`).includes(n)
    })
  }, [equipos, q, servicio, tipo, estado, servicios])

  const certOf = (id: number) => db.certificaciones.find((c) => c.equipoId === id)
  const mpOf = (id: number) => db.mantenimientos.find((m) => m.equipoId === id)

  const download = () => exportCsv('equipos.csv', rows.map((e) => ({
    QR: e.qr, Tipo: e.tipo, Fabricante: e.fabricante, Modelo: e.modelo, Serie: e.serie,
    Servicio: servicios.get(e.servicioId), Estado: e.estado, Pertenencia: e.pertenencia,
    Certificacion: fecha(certOf(e.id)?.vencimientoISO), Preventivo: fecha(mpOf(e.id)?.proximoISO),
  })))

  return (
    <Page title="Equipos" sub={`${rows.length} de ${equipos.length} equipos · ${cliente?.nombre}`}
      actions={<button className="btn secondary" onClick={download} disabled={!rows.length}><Download size={16} /> Exportar</button>}>
      <div className="card pad">
        <div className="filters" style={{ marginBottom: 14 }}>
          <label className="search" style={{ flex: '1 1 260px' }}>
            <Search size={16} />
            <input placeholder="Buscar por tipo, marca, modelo, serie o QR…" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE) }} />
          </label>
          <select className="sel" value={servicio} onChange={(e) => setServicio(e.target.value)}><option value="">Todos los servicios</option>{opts.servicios.map(([id, nm]) => <option key={id} value={id}>{nm}</option>)}</select>
          <select className="sel" value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="">Todos los tipos</option>{opts.tipos.map((t) => <option key={t}>{t}</option>)}</select>
          <select className="sel" value={estado} onChange={(e) => setEstado(e.target.value)}><option value="">Todos los estados</option>{opts.estados.map((t) => <option key={t}>{t}</option>)}</select>
        </div>
        {rows.length === 0 ? <EmptyState icon={<Stethoscope size={22} />}>No hay equipos con esos filtros.</EmptyState> : (
          <>
            <div className="tbl-wrap">
              <table className="tbl cards">
                <thead><tr><th>Equipo</th><th>Serie</th><th>Servicio</th><th>Estado</th><th>Certificación</th><th>Preventivo</th><th /></tr></thead>
                <tbody>
                  {rows.slice(0, limit).map((e) => {
                    const c = e.certificable ? certOf(e.id) : null
                    const m = e.mantenible ? mpOf(e.id) : null
                    return (
                      <tr key={e.id} onClick={() => setSel(e)}>
                        <td data-label="Equipo"><div className="row-strong">{e.tipo}</div><div className="faint small">{e.fabricante} · {e.modelo}</div></td>
                        <td data-label="Serie"><span className="mono small">{e.serie}</span></td>
                        <td data-label="Servicio">{servicios.get(e.servicioId)}</td>
                        <td data-label="Estado"><EstadoBadge estado={e.estado} /></td>
                        <td data-label="Certificación">{c ? <VigBadge estado={vigencia(c.vencimientoISO)} /> : <span className="faint small">No aplica</span>}</td>
                        <td data-label="Preventivo">{m ? <VigBadge estado={vigencia(m.proximoISO)} /> : <span className="faint small">No aplica</span>}</td>
                        <td style={{ textAlign: 'right' }}><ChevronRight size={17} style={{ color: 'var(--text-3)' }} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {limit < rows.length && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 16 }}><button className="btn secondary" onClick={() => setLimit((l) => l + PAGE * 2)}>Mostrar más ({rows.length - limit})</button></div>}
          </>
        )}
      </div>
      {sel && <Ficha equipo={sel} onClose={() => setSel(null)} readOnly={readOnly} />}
    </Page>
  )
}

function Ficha({ equipo, onClose, readOnly }: { equipo: Equipo; onClose: () => void; readOnly?: boolean }) {
  const { db } = useStore()
  const cliente = db.clientes.find((c) => c.id === equipo.clienteId)!
  const servicio = db.servicios.find((s) => s.id === equipo.servicioId)
  const cert = db.certificaciones.find((c) => c.equipoId === equipo.id)
  const mp = db.mantenimientos.find((m) => m.equipoId === equipo.id)
  const ordenes = db.ordenes.filter((o) => o.equipoId === equipo.id).sort((a, b) => b.aperturaISO.localeCompare(a.aperturaISO))

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <div><div className="faint small mono">{equipo.qr}</div><h3 style={{ fontSize: 17 }}>{equipo.tipo}</h3><div className="faint small">{equipo.fabricante} · {equipo.modelo}</div></div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="drawer-body">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <EstadoBadge estado={equipo.estado} />
            <Badge tone={equipo.criticidad === 'ALTA' ? 'danger' : equipo.criticidad === 'MEDIA' ? 'warn' : 'neutral'}>Criticidad {equipo.criticidad}</Badge>
            <Badge>{equipo.pertenencia}</Badge>
          </div>

          <div className="qr-label">
            <Qr text={equipo.qr} size={96} />
            <div className="meta">
              <span className="faint small">Etiqueta del equipo</span>
              <b style={{ fontSize: 15, marginTop: 2 }}>{equipo.tipo}</b>
              <div className="small" style={{ color: '#51666e' }}>{equipo.fabricante} {equipo.modelo}</div>
              <div className="mono small" style={{ color: '#51666e', marginTop: 4 }}>{equipo.qr} · S/N {equipo.serie}</div>
            </div>
          </div>
          {!readOnly && <button className="btn secondary sm" onClick={() => window.print()}><Printer size={15} /> Imprimir etiqueta</button>}

          <div className="grid-2" style={{ gap: 14 }}>
            <div className="card pad">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <b style={{ fontSize: 13 }}>Certificación</b>
                {cert && <VigBadge estado={vigencia(cert.vencimientoISO)} />}
              </div>
              {cert ? <>
                <Row k="Última" v={fecha(cert.fechaISO)} /><Row k="Vence" v={fecha(cert.vencimientoISO)} /><Row k="N°" v={cert.numero} />
                <button className="btn secondary sm" style={{ marginTop: 10, width: '100%' }} onClick={() => certificadoPDF(equipo, cliente, cert.numero, cert.vencimientoISO)}><Download size={14} /> Certificado PDF</button>
              </> : <span className="faint small">No certificable</span>}
            </div>
            <div className="card pad">
              <div style={{ marginBottom: 8 }}><b style={{ fontSize: 13 }}>Mantenimiento preventivo</b></div>
              {mp ? <><Row k="Plan" v={mp.plan} /><Row k="Último" v={fecha(mp.fechaISO)} /><Row k="Próximo" v={fecha(mp.proximoISO)} /></> : <span className="faint small">Sin plan de MP</span>}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><QrCode size={15} style={{ color: 'var(--brand)' }} /><b style={{ fontSize: 14 }}>Historia clínica</b><span className="faint small">{ordenes.length} órdenes</span></div>
            {ordenes.length ? (
              <ul className="timeline">
                {ordenes.map((o) => (
                  <li key={o.id}>
                    <div className="t-date">{fecha(o.aperturaISO)} · {o.numero}</div>
                    <div className="t-body">{clean(o.titulo)}</div>
                    <div className="t-meta">{o.tipo} · {o.tecnico} · <span style={{ color: o.situacion === 'Cerrada' ? 'var(--ok)' : 'var(--warn)' }}>{o.situacion}</span></div>
                  </li>
                ))}
              </ul>
            ) : <span className="faint small">Sin órdenes registradas.</span>}
          </div>

          <div className="card pad">
            <Row k="Cliente" v={cliente.nombre} /><Row k="Servicio" v={servicio?.nombre ?? '—'} /><Row k="Ubicación" v={equipo.ubicacion} /><Row k="Alta" v={fecha(equipo.altaISO)} />
          </div>
        </div>
      </aside>
    </>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '3px 0', fontSize: 13 }}><span className="faint">{k}</span><span style={{ fontWeight: 500, textAlign: 'right' }}>{v}</span></div>
}

export default function Equipos() {
  const { user } = useStore()
  return <RequireCliente>{(id) => <Lista clienteId={id} readOnly={user?.rol === 'CLIENTE'} />}</RequireCliente>
}
