import { useCallback, useState } from 'react'
import { Check, CheckSquare, Download, ImageDown, X } from 'lucide-react'

/** Estado de selección múltiple reutilizable para las listas. */
export function useSelection() {
  const [on, setOn] = useState(false)
  const [sel, setSel] = useState<Set<number>>(new Set())
  const toggle = useCallback((id: number) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n }), [])
  const clear = useCallback(() => setSel(new Set()), [])
  const exit = useCallback(() => { setOn(false); setSel(new Set()) }, [])
  const selectMany = useCallback((ids: number[]) => setSel(new Set(ids)), [])
  return { on, setOn, sel, size: sel.size, has: (id: number) => sel.has(id), toggle, clear, exit, selectMany }
}

/** Botón para entrar/salir del modo selección (va en las acciones de la página). */
export function SelectToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button className={`btn ${on ? 'primary' : 'secondary'}`} onClick={onToggle}>
      <CheckSquare size={16} /> {on ? 'Listo' : 'Seleccionar'}
    </button>
  )
}

/** Casilla de selección que se superpone a cada tarjeta. */
export function SelectBox({ checked }: { checked: boolean }) {
  return <span className={`selbox ${checked ? 'on' : ''}`} aria-hidden>{checked && <Check size={14} />}</span>
}

/** Barra flotante con acciones sobre la selección. */
export function SelectionBar({ count, total, onAll, onCsv, onImg, onClear }: { count: number; total: number; onAll: () => void; onCsv: () => void; onImg: () => void; onClear: () => void }) {
  if (count === 0) return null
  return (
    <div className="selbar">
      <span className="selbar-n">{count} seleccionado{count === 1 ? '' : 's'}</span>
      {count < total && <button className="selbar-link" onClick={onAll}>Todos</button>}
      <button className="selbar-link" onClick={onClear}><X size={15} /> Limpiar</button>
      <div className="selbar-sp" />
      <button className="btn secondary sm" onClick={onCsv}><Download size={15} /> CSV</button>
      <button className="btn primary sm" onClick={onImg}><ImageDown size={15} /> Compartir</button>
    </div>
  )
}
