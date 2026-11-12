import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Check, ChevronsUpDown, Scale, Search } from 'lucide-react'
import { useStore } from '../lib/store'
import { initials, normalize } from '../lib/format'
import type { Cliente } from '../lib/types'

export function ClientList({ onPick, autoFocus }: { onPick: (c: Cliente) => void; autoFocus?: boolean }) {
  const { clientesVisibles, cliente } = useStore()
  const [q, setQ] = useState('')
  const rows = useMemo(() => {
    const n = normalize(q)
    return n ? clientesVisibles.filter((c) => normalize(c.nombre).includes(n)) : clientesVisibles
  }, [clientesVisibles, q])
  return (
    <div>
      <label className="search">
        <Search size={16} />
        <input autoFocus={autoFocus} placeholder="Buscar cliente…" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <ul className="opt-list">
        {rows.map((c) => (
          <li key={c.id}>
            <button className={cliente?.id === c.id ? 'active' : ''} onClick={() => onPick(c)}>
              <span className="logo" style={{ background: c.color }}>{c.corto.slice(0, 3)}</span>
              <span style={{ flex: 1 }}>{c.nombre}</span>
              {cliente?.id === c.id && <Check size={16} />}
            </button>
          </li>
        ))}
        {rows.length === 0 && <li className="faint" style={{ padding: 12 }}>Sin coincidencias.</li>}
      </ul>
    </div>
  )
}

export default function ClientPicker() {
  const { cliente, setCliente } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  return (
    <div className="cpick" ref={ref}>
      <button className="cpick-trigger" onClick={() => setOpen((o) => !o)}>
        {cliente ? <span className="logo" style={{ background: cliente.color }}>{initials(cliente.corto)}</span> : <Building2 size={18} />}
        <span className="nm">{cliente?.nombre ?? 'Elegir cliente'}</span>
        <ChevronsUpDown size={15} style={{ color: 'var(--text-3)' }} />
      </button>
      {open && (
        <div className="popover">
          <Link to="/comparativa" className="cpick-compare" onClick={() => setOpen(false)}><Scale size={15} /> Comparar todos los clientes</Link>
          <ClientList autoFocus onPick={(c) => { setCliente(c); setOpen(false) }} />
        </div>
      )}
    </div>
  )
}
