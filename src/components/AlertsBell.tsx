import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CalendarClock, ShieldCheck } from 'lucide-react'
import { useAlertas, useStore } from '../lib/store'
import { fecha, diasHasta } from '../lib/format'

export default function AlertsBell() {
  const { cliente, user } = useStore()
  const scope = user?.rol === 'CLIENTE' ? cliente?.id : cliente?.id
  const alertas = useAlertas(scope)
  const vencidos = alertas.filter((a) => a.estado === 'VENCIDO').length
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const nav = useNavigate()
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="bell" ref={ref} style={{ position: 'relative' }}>
      <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-label="Alertas">
        <Bell size={19} />
        {alertas.length > 0 && <span className="badge-n">{alertas.length > 99 ? '99+' : alertas.length}</span>}
      </button>
      {open && (
        <div className="popover" style={{ right: 0, left: 'auto', width: 'min(380px, calc(100vw - 32px))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px 10px' }}>
            <strong style={{ fontFamily: 'var(--ff-d)' }}>Alertas de vencimiento</strong>
            <span className="badge tone-danger">{vencidos} vencidas</span>
          </div>
          <ul className="opt-list" style={{ maxHeight: 360 }}>
            {alertas.slice(0, 12).map((a, i) => {
              const d = diasHasta(a.vencimientoISO)
              return (
                <li key={i}>
                  <button onClick={() => { setOpen(false); nav('/vencimientos') }}>
                    <span className="logo" style={{ background: a.estado === 'VENCIDO' ? 'var(--danger)' : 'var(--warn)' }}>
                      {a.tipo === 'Certificación' ? <ShieldCheck size={14} /> : <CalendarClock size={14} />}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.equipo}</span>
                      <span className="faint small">{a.tipo} · {a.servicio}</span>
                    </span>
                    <span className="small mono" style={{ color: a.estado === 'VENCIDO' ? 'var(--danger)' : 'var(--warn)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {a.estado === 'VENCIDO' ? `−${Math.abs(d ?? 0)}d` : `${d}d`}<br /><span className="faint">{fecha(a.vencimientoISO)}</span>
                    </span>
                  </button>
                </li>
              )
            })}
            {alertas.length === 0 && <li className="faint" style={{ padding: 12 }}>Sin vencimientos próximos.</li>}
          </ul>
          <button className="btn secondary block sm" style={{ marginTop: 8 }} onClick={() => { setOpen(false); nav('/vencimientos') }}>Ver todos</button>
        </div>
      )}
    </div>
  )
}
