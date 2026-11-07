import { NavLink, Outlet } from 'react-router-dom'
import {
  Boxes, ClipboardList, LayoutDashboard, LogOut, Moon, Settings2, Stethoscope,
  Sun, Wrench, CalendarClock, Building2, ScrollText, QrCode, Bell,
} from 'lucide-react'
import type { ReactNode } from 'react'
import ClientPicker from './ClientPicker'
import AlertsBell from './AlertsBell'
import { ROLE_LABEL, useAlertas, useStore } from '../lib/store'
import { useTheme } from './theme'
import { initials } from '../lib/format'

interface NavItem { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean; count?: number; danger?: boolean }

export default function Layout() {
  const { user, cliente, db, logout } = useStore()
  const { theme, toggle } = useTheme()
  const alertas = useAlertas(cliente?.id)
  const esCliente = user?.rol === 'CLIENTE'

  const abiertas = db.ordenes.filter((o) => o.situacion !== 'Cerrada' && (!cliente || o.clienteId === cliente.id)).length

  const groups: { label: string; items: NavItem[] }[] = esCliente
    ? [{
        label: 'Portal',
        items: [
          { to: '/portal', label: 'Mi equipamiento', icon: LayoutDashboard, end: true },
          { to: '/equipos', label: 'Equipos', icon: Stethoscope },
          { to: '/vencimientos', label: 'Vencimientos', icon: CalendarClock, count: alertas.length, danger: alertas.length > 0 },
        ],
      }]
    : [
        { label: 'Principal', items: [{ to: '/', label: 'Tablero', icon: LayoutDashboard, end: true }] },
        {
          label: 'Operación',
          items: [
            { to: '/ordenes', label: 'Órdenes de servicio', icon: ClipboardList, count: abiertas },
            { to: '/equipos', label: 'Equipos', icon: Stethoscope },
            { to: '/taller', label: 'Taller', icon: Wrench },
            { to: '/etiquetas', label: 'Etiquetas QR', icon: QrCode },
          ],
        },
        {
          label: 'Gestión',
          items: [
            { to: '/vencimientos', label: 'Vencimientos', icon: CalendarClock, count: alertas.length, danger: alertas.filter((a) => a.estado === 'VENCIDO').length > 0 },
            { to: '/notificaciones', label: 'Notificaciones', icon: Bell },
            { to: '/portal', label: 'Portal del cliente', icon: Building2 },
            { to: '/auditoria', label: 'Auditoría', icon: ScrollText },
            { to: '/configuracion', label: 'Configuración', icon: Settings2 },
          ],
        },
      ]

  const allItems = groups.flatMap((g) => g.items)
  const bottomItems = allItems.slice(0, 5)

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="mark"><Boxes size={22} /></span>
          <div><b>SGEM</b><small>Plus</small></div>
        </div>
        <nav className="nav">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="group-label">{g.label}</div>
              {g.items.map((it) => (
                <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => (isActive ? 'active' : '')}>
                  <it.icon size={18} />
                  <span>{it.label}</span>
                  {it.count != null && it.count > 0 && <span className={`count ${it.danger ? 'danger' : ''}`}>{it.count}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="av" style={{ background: user?.color }}>{initials(`${user?.nombre} ${user?.apellido}`)}</span>
          <div className="who">
            <b>{user?.nombre} {user?.apellido}</b>
            <span>{user ? ROLE_LABEL[user.rol] : ''}</span>
          </div>
          <button className="icon-btn" onClick={logout} title="Salir"><LogOut size={17} /></button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="brand-mobile"><span className="mark"><Boxes size={18} /></span> SGEM</div>
          {!esCliente && <ClientPicker />}
          {esCliente && cliente && (
            <span className="chip on"><Building2 size={15} /> {cliente.nombre}</span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertsBell />
            <button className="icon-btn" onClick={toggle} title="Tema" aria-label="Cambiar tema">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>

      <nav className="bottom-nav">
        {bottomItems.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <it.icon size={19} />
            <span>{it.label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function Page({ title, sub, actions, children }: { title: string; sub?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          {sub && <div className="sub">{sub}</div>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
      {children}
    </>
  )
}
