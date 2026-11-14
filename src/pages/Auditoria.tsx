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
  const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
  const rows = useMemo(() => {
    const n = normalize(q)
    return n ? db.auditoria.filter((a) => normalize(`${a.usuario} ${a.accion} ${a.detalle}`).includes(n)) : db.auditoria
  }, [db.auditoria, q])
  const dias = useMemo(() => {
    const m = new Map<string, typeof rows>()
    for (const a of rows) { const k = a.fechaISO.slice(0, 10); (m.get(k) ?? m.set(k, []).get(k)!).push(a) }
    return [...m]
  }, [rows])

  return (
    <Page title="Auditoría" sub={`Bitácora de la plataforma · ${db.auditoria.length} asientos`}
      actions={<SelectToggle on={selection.on} onToggle={() => (selection.on ? selection.exit() : selection.setOn(true))} />}>
      {db.auditoria.length > 0 && (
        <div className="card pad"><label className="search"><Search size={16} /><input placeholder="Buscar por usuario, acción o detalle…" value={q} onChange={(e) => setQ(e.target.value)} /></label></div>
      )}
      {rows.length === 0 ? <div className="card"><EmptyState /></div> : (
        <div className="bt">
          {dias.map(([dia, list]) => {
            const d = new Date(list[0].fechaISO)
            return (
              <section key={dia} className="bt-day">
                <header className="bt-date">
                  <b>{String(d.getDate()).padStart(2, '0')}</b>
                  <span>{d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')} {d.getFullYear()}</span>
                  <small>{d.toLocaleDateString('es-AR', { weekday: 'long' })} · {list.length} asiento{list.length === 1 ? '' : 's'}</small>
                </header>
                <ol className="bt-list">
                  {list.map((a) => (
                    <li key={a.id} className={`${selection.on ? 'selectable' : ''} ${selection.has(a.id) ? 'selected' : ''}`} onClick={selection.on ? () => selection.toggle(a.id) : undefined}>
                      <time>{hora(a.fechaISO)}</time>
                      {selection.on ? <SelectBox checked={selection.has(a.id)} /> : <span className="bt-ini">{a.usuario.split(/[.\s]/).map((x) => x.charAt(0).toUpperCase()).join('').slice(0, 2)}</span>}
                      <div><b>{a.accion}</b><p>{a.detalle}</p><small>{a.usuario}</small></div>
                    </li>
                  ))}
                </ol>
              </section>
            )
          })}
        </div>
      )}
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
