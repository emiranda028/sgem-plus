import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import { useStore } from './lib/store'
import { useTheme } from './components/theme'
import { EmptyState } from './components/ui'

const Tablero = lazy(() => import('./pages/Tablero'))
const Equipos = lazy(() => import('./pages/Equipos'))
const Ordenes = lazy(() => import('./pages/Ordenes'))
const Taller = lazy(() => import('./pages/Taller'))
const Vencimientos = lazy(() => import('./pages/Vencimientos'))
const Etiquetas = lazy(() => import('./pages/Etiquetas'))
const Notificaciones = lazy(() => import('./pages/Notificaciones'))
const Agenda = lazy(() => import('./pages/Agenda'))
const Reportes = lazy(() => import('./pages/Reportes'))
const Comparativa = lazy(() => import('./pages/Comparativa'))
const Portal = lazy(() => import('./pages/Portal'))
const Auditoria = lazy(() => import('./pages/Auditoria'))
const Configuracion = lazy(() => import('./pages/Configuracion'))

function Guard({ children }: { children: ReactNode }) {
  const { user } = useStore()
  const loc = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  return <>{children}</>
}

/** Rutas internas: el rol CLIENTE queda fuera y se lo manda a su portal. */
function Staff({ children }: { children: ReactNode }) {
  const { user } = useStore()
  if (user?.rol === 'CLIENTE') return <Navigate to="/portal" replace />
  return <Suspense fallback={<Load />}>{children}</Suspense>
}

export default function App() {
  useTheme() // aplica el atributo data-theme
  const { user } = useStore()
  const home = user?.rol === 'CLIENTE' ? '/portal' : '/'
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', localStorage.getItem('sgem.plus.theme') || 'light')
  }, [])
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Guard><Layout /></Guard>}>
        <Route index element={user?.rol === 'CLIENTE' ? <Navigate to="/portal" replace /> : <Suspense fallback={<Load />}><Tablero /></Suspense>} />
        <Route path="ordenes" element={<Staff><Ordenes /></Staff>} />
        <Route path="equipos" element={<Suspense fallback={<Load />}><Equipos /></Suspense>} />
        <Route path="taller" element={<Staff><Taller /></Staff>} />
        <Route path="agenda" element={<Staff><Agenda /></Staff>} />
        <Route path="reportes" element={<Staff><Reportes /></Staff>} />
        <Route path="comparativa" element={<Staff><Comparativa /></Staff>} />
        <Route path="etiquetas" element={<Staff><Etiquetas /></Staff>} />
        <Route path="vencimientos" element={<Suspense fallback={<Load />}><Vencimientos /></Suspense>} />
        <Route path="notificaciones" element={<Staff><Notificaciones /></Staff>} />
        <Route path="portal" element={<Suspense fallback={<Load />}><Portal /></Suspense>} />
        <Route path="auditoria" element={<Staff><Auditoria /></Staff>} />
        <Route path="configuracion" element={<Staff><Configuracion /></Staff>} />
      </Route>
      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  )
}

function Load() {
  return <div className="card pad"><EmptyState>Cargando…</EmptyState></div>
}
