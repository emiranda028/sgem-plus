import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Page } from '../components/Layout'
import { EmptyState } from '../components/ui'
import { SelectBox, SelectToggle, SelectionBar, useSelection } from '../components/Selection'
import { useStore } from '../lib/store'
import { exportCsv, shareSelectionImage } from '../lib/share'
import { fecha, normalize } from '../lib/format'

export default function Auditoria() {
  const { db } = useStore()
  const [q, setQ] = useState('')
  const selection = useSelection()
  const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const rows = useMemo(() => {
    const n = normalize(q)
    return n ? db.auditoria.filter((a) => normalize(`${a.usuario} ${a.accion} ${a.detalle}`).includes(n)) : db.auditoria
  }, [db.auditoria, q])

  return (
    <Page title="Auditoría" sub="Registro de acciones de la plataforma"
      actions={<SelectToggle on={selection.on} onToggle={() => (selection.on ? selection.exit() : selection.setOn(true))} />}>
      {db.auditoria.length > 0 && (
        <div className="card pad"><label className="search"><Search size={16} /><input placeholder="Buscar por usuario, acción o detalle…" value={q} onChange={(e) => setQ(e.target.value)} /></label></div>
      )}
      <div className="card">
        {rows.length === 0 ? <EmptyState /> : (
          <div className="tbl-wrap">
            <table className="tbl cards">
              <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className={`${selection.on ? 'selectable' : ''} ${selection.has(a.id) ? 'selected' : ''}`} onClick={selection.on ? () => selection.toggle(a.id) : undefined}>
                    <td className="mono small faint"><div className="sel-head">{selection.on && <SelectBox checked={selection.has(a.id)} />}<span>{fecha(a.fechaISO)} {hora(a.fechaISO)}</span></div></td>
                    <td className="mono small">{a.usuario}</td>
                    <td className="row-strong">{a.accion}</td>
                    <td className="muted">{a.detalle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selection.on && (
        <SelectionBar count={selection.size} total={rows.length}
          onAll={() => selection.selectMany(rows.map((a) => a.id))}
          onClear={selection.clear}
          onCsv={() => exportCsv('auditoria-seleccion.csv', rows.filter((a) => selection.has(a.id)).map((a) => ({ Fecha: `${fecha(a.fechaISO)} ${hora(a.fechaISO)}`, Usuario: a.usuario, Accion: a.accion, Detalle: a.detalle })))}
          onImg={() => shareSelectionImage({ title: 'Auditoría', subtitle: 'Registro de acciones', filename: 'auditoria-sgem.png', items: rows.filter((a) => selection.has(a.id)).map((a) => ({ titulo: a.accion, lineas: [a.detalle, `${a.usuario} · ${fecha(a.fechaISO)} ${hora(a.fechaISO)}`] })) })}
        />
      )}
    </Page>
  )
}
