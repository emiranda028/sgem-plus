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
      <div className="et-top no-print">
        <span><b>{aImprimir.length}</b> etiqueta{aImprimir.length === 1 ? '' : 's'} · <b>{Math.max(1, Math.ceil(aImprimir.length / 24))}</b> hoja{aImprimir.length > 24 ? 's' : ''} A4 · {sel.size ? 'selección manual' : 'todo el filtro'}</span>
        <span className="et-acc"><button onClick={todos}>Seleccionar todas</button><button onClick={ninguno} disabled={!sel.size}>Limpiar</button></span>
      </div>
      {equipos.length === 0 ? <div className="card"><EmptyState icon={<QrCode size={22} />}>No hay equipos para este filtro.</EmptyState></div> : (
        <div className="labels-grid">
          {equipos.map((e) => {
            const on = sel.has(e.id)
            return (
              <button key={e.id} className={`ql ${on ? 'on' : ''} ${sel.size && !on ? 'no-print' : ''}`} onClick={() => toggle(e.id)}>
                {on && <span className="ql-ok no-print"><Check size={12} /></span>}
                <Qr text={e.qr} size={78} />
                <div className="qm">
                  <div className="code">{e.qr}</div>
                  <div className="t">{e.tipo}</div>
                  <div className="s">{e.fabricante} {e.modelo}</div>
                  <div className="s">S/N {e.serie}</div>
                  <div className="s">{servName(e.servicioId)}</div>
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
