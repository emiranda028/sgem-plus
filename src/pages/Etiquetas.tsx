import { useMemo, useState } from 'react'
import { Check, Download, Printer, QrCode } from 'lucide-react'
import { Page } from '../components/Layout'
import RequireCliente from '../components/RequireCliente'
import { EmptyState } from '../components/ui'
import { Qr } from '../components/Qr'
import { useStore } from '../lib/store'
import { etiquetasPDF } from '../lib/pdf'

function Etiquetas({ clienteId }: { clienteId: number }) {
  const { db, cliente } = useStore()
  const servicios = useMemo(() => db.servicios.filter((s) => s.clienteId === clienteId), [db.servicios, clienteId])
  const [servicio, setServicio] = useState('')
  const [sel, setSel] = useState<Set<number>>(new Set())

  const equipos = useMemo(
    () => db.equipos.filter((e) => e.clienteId === clienteId && e.estado !== 'BAJA' && (!servicio || String(e.servicioId) === servicio)),
    [db.equipos, clienteId, servicio],
  )
  const servName = (id: number) => servicios.find((s) => s.id === id)?.nombre ?? ''

  const toggle = (id: number) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const todos = () => setSel(new Set(equipos.map((e) => e.id)))
  const ninguno = () => setSel(new Set())

  const aImprimir = sel.size ? equipos.filter((e) => sel.has(e.id)) : equipos

  return (
    <Page title="Etiquetas QR" sub={`${cliente?.nombre} · generá e imprimí las etiquetas del equipamiento`}
      actions={
        <div className="page-actions no-print">
          <select className="sel" value={servicio} onChange={(e) => { setServicio(e.target.value); ninguno() }}>
            <option value="">Todos los servicios</option>
            {servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          <button className="btn secondary" onClick={() => etiquetasPDF(aImprimir, cliente?.nombre ?? '')} disabled={!aImprimir.length}><Download size={16} /> PDF</button>
          <button className="btn primary" onClick={() => window.print()} disabled={!aImprimir.length}><Printer size={16} /> Imprimir ({aImprimir.length})</button>
        </div>
      }>
      <div className="card pad no-print" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <QrCode size={18} style={{ color: 'var(--brand)' }} />
        <span className="muted">{sel.size ? `${sel.size} seleccionados` : `Se imprimirán los ${equipos.length} equipos`}. Tocá una tarjeta para elegir cuáles.</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn secondary sm" onClick={todos}>Seleccionar todos</button>
          <button className="btn ghost sm" onClick={ninguno}>Limpiar</button>
        </div>
      </div>

      {equipos.length === 0 ? <div className="card"><EmptyState icon={<QrCode size={22} />}>No hay equipos para este filtro.</EmptyState></div> : (
        <div className="labels-grid">
          {equipos.map((e) => {
            const on = sel.has(e.id)
            return (
              <button key={e.id} className="ql" onClick={() => toggle(e.id)} style={{ position: 'relative', textAlign: 'left', borderColor: on ? 'var(--brand)' : undefined, boxShadow: on ? '0 0 0 2px var(--brand-soft)' : undefined }}>
                {on && <span className="no-print" style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: 'var(--brand)', color: '#fff', display: 'grid', placeItems: 'center' }}><Check size={12} /></span>}
                <Qr text={e.qr} size={78} />
                <div className="qm">
                  <div className="t">{e.tipo}</div>
                  <div className="s">{e.fabricante} {e.modelo}</div>
                  <div className="s">S/N {e.serie}</div>
                  <div className="s">{servName(e.servicioId)}</div>
                  <div className="code">{e.qr}</div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </Page>
  )
}

export default function EtiquetasPage() {
  return <RequireCliente>{(id) => <Etiquetas clienteId={id} />}</RequireCliente>
}
