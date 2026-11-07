import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { DB, OrdenServicio, Equipo, Usuario, Cliente } from './types'
import { buildSeed } from './seed'
import { vigencia } from './format'

const DB_KEY = 'sgem.plus.db.v3'
const SESSION_KEY = 'sgem.plus.user'
const CLIENT_KEY = 'sgem.plus.cliente'

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DB
      if (parsed.version === 3) return parsed
    }
  } catch { /* ignore */ }
  const seed = buildSeed()
  try { localStorage.setItem(DB_KEY, JSON.stringify(seed)) } catch { /* ignore */ }
  return seed
}

interface Store {
  db: DB
  user: Usuario | null
  cliente: Cliente | null
  clientesVisibles: Cliente[]
  login: (username: string) => boolean
  logout: () => void
  setCliente: (c: Cliente | null) => void
  resetDemo: () => void
  // mutaciones
  addOrden: (o: Omit<OrdenServicio, 'id' | 'numero' | 'acciones' | 'aperturaISO' | 'cierreISO' | 'fotos' | 'firmaDataUrl' | 'firmante'> & Partial<OrdenServicio>) => OrdenServicio
  updateOrden: (id: number, patch: Partial<OrdenServicio>) => void
  addAccion: (ordenId: number, nota: string) => void
  updateEquipo: (id: number, patch: Partial<Equipo>) => void
  generarPlan: (clienteId: number) => number
  log: (accion: string, detalle: string) => void
}

const Ctx = createContext<Store | null>(null)

function read<T>(key: string): T | null {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null } catch { return null }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(loadDB)
  const [user, setUser] = useState<Usuario | null>(() => read<Usuario>(SESSION_KEY))
  const [cliente, setClienteState] = useState<Cliente | null>(() => read<Cliente>(CLIENT_KEY))

  useEffect(() => {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)) } catch { /* ignore */ }
  }, [db])

  const log = useCallback((accion: string, detalle: string) => {
    setDb((d) => ({
      ...d,
      auditoria: [
        { id: Math.max(0, ...d.auditoria.map((x) => x.id)) + 1, fechaISO: new Date().toISOString(), usuario: user?.username ?? 'sistema', accion, detalle },
        ...d.auditoria,
      ].slice(0, 200),
    }))
  }, [user])

  const login = useCallback((username: string) => {
    const u = db.usuarios.find((x) => x.username === username.trim().toLowerCase())
    if (!u) return false
    localStorage.setItem(SESSION_KEY, JSON.stringify(u))
    setUser(u)
    // cliente por defecto para rol CLIENTE
    if (u.rol === 'CLIENTE' && u.clienteIds[0]) {
      const c = db.clientes.find((x) => x.id === u.clienteIds[0]) ?? null
      if (c) { localStorage.setItem(CLIENT_KEY, JSON.stringify(c)); setClienteState(c) }
    }
    return true
  }, [db])

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }, [])

  const setCliente = useCallback((c: Cliente | null) => {
    if (c) localStorage.setItem(CLIENT_KEY, JSON.stringify(c))
    else localStorage.removeItem(CLIENT_KEY)
    setClienteState(c)
  }, [])

  const resetDemo = useCallback(() => {
    const seed = buildSeed()
    localStorage.setItem(DB_KEY, JSON.stringify(seed))
    setDb(seed)
  }, [])

  const addOrden: Store['addOrden'] = useCallback((o) => {
    const now = new Date()
    const numero = `OS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(2000 + db.ordenes.length)}`
    const nueva: OrdenServicio = {
      fotos: 0,
      ...o,
      id: Math.max(0, ...db.ordenes.map((x) => x.id)) + 1,
      numero,
      aperturaISO: now.toISOString(),
      cierreISO: null,
      acciones: [{ id: 1, fechaISO: now.toISOString(), usuario: user?.username ?? 'sistema', nota: 'Orden abierta.' }],
    } as OrdenServicio
    setDb((d) => ({ ...d, ordenes: [nueva, ...d.ordenes] }))
    log('Creó OS', `${numero} · ${nueva.titulo}`)
    return nueva
  }, [db.ordenes, user, log])

  const updateOrden = useCallback((id: number, patch: Partial<OrdenServicio>) => {
    setDb((d) => ({ ...d, ordenes: d.ordenes.map((o) => (o.id === id ? { ...o, ...patch } : o)) }))
  }, [])

  const addAccion = useCallback((ordenId: number, nota: string) => {
    setDb((d) => ({
      ...d,
      ordenes: d.ordenes.map((o) =>
        o.id === ordenId
          ? { ...o, acciones: [...o.acciones, { id: o.acciones.length + 1, fechaISO: new Date().toISOString(), usuario: user?.username ?? 'sistema', nota }] }
          : o,
      ),
    }))
    log('Agregó acción', nota)
  }, [user, log])

  const updateEquipo = useCallback((id: number, patch: Partial<Equipo>) => {
    setDb((d) => ({ ...d, equipos: d.equipos.map((e) => (e.id === id ? { ...e, ...patch } : e)) }))
  }, [])

  // Genera órdenes de MP/certificación para los vencimientos sin una OS abierta de ese tipo.
  const generarPlan = useCallback((clienteId: number) => {
    const now = new Date()
    const nowISO = now.toISOString()
    const dentro = (iso: string) => (new Date(iso).getTime() - now.getTime()) / 86400000 <= 30
    let seq = 0
    const nuevas: OrdenServicio[] = []
    const base = Math.max(0, ...db.ordenes.map((x) => x.id))
    const eqs = db.equipos.filter((e) => e.clienteId === clienteId && e.estado !== 'BAJA')
    const abiertasPorEquipo = (equipoId: number, tipo: string) =>
      db.ordenes.some((o) => o.equipoId === equipoId && o.situacion !== 'Cerrada' && o.tipo === tipo) ||
      nuevas.some((o) => o.equipoId === equipoId && o.tipo === tipo)

    const mk = (e: Equipo, tipo: 'Mantenimiento preventivo' | 'Certificación') => {
      seq++
      nuevas.push({
        id: base + seq,
        numero: `OS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(5000 + base + seq)}`,
        clienteId, equipoId: e.id, servicioId: e.servicioId, tipo,
        titulo: `${tipo}: ${e.tipo} ${e.fabricante}`, descripcion: 'Generada automáticamente por plan de vencimientos.',
        criticidad: e.criticidad, situacion: 'Abierta', taller: db.talleres[0], tecnico: 'sistema',
        aperturaISO: nowISO, cierreISO: null, origen: 'Interna', fotos: 0,
        acciones: [{ id: 1, fechaISO: nowISO, usuario: 'sistema', nota: 'Orden generada por el plan automático.' }],
      } as OrdenServicio)
    }
    for (const e of eqs) {
      const c = db.certificaciones.find((x) => x.equipoId === e.id)
      if (c && dentro(c.vencimientoISO) && !abiertasPorEquipo(e.id, 'Certificación')) mk(e, 'Certificación')
      const m = db.mantenimientos.find((x) => x.equipoId === e.id)
      if (m && dentro(m.proximoISO) && !abiertasPorEquipo(e.id, 'Mantenimiento preventivo')) mk(e, 'Mantenimiento preventivo')
    }
    if (nuevas.length) {
      setDb((d) => ({ ...d, ordenes: [...nuevas, ...d.ordenes] }))
      log('Plan automático', `Generó ${nuevas.length} órdenes de mantenimiento/certificación.`)
    }
    return nuevas.length
  }, [db, log])

  const clientesVisibles = useMemo(() => {
    const list = user?.rol === 'CLIENTE' ? db.clientes.filter((c) => user.clienteIds.includes(c.id)) : db.clientes
    return [...list].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [db.clientes, user])

  const value: Store = {
    db, user, cliente, clientesVisibles,
    login, logout, setCliente, resetDemo,
    addOrden, updateOrden, addAccion, updateEquipo, generarPlan, log,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore fuera de StoreProvider')
  return s
}

/** Alertas de vencimiento derivadas de certificaciones y mantenimientos. */
export interface Alerta {
  tipo: 'Certificación' | 'Mantenimiento'
  equipoId: number
  equipo: string
  cliente: string
  clienteId: number
  servicio: string
  vencimientoISO: string
  estado: 'VENCIDO' | 'POR_VENCER'
}

export function useAlertas(clienteId?: number): Alerta[] {
  const { db } = useStore()
  return useMemo(() => {
    const out: Alerta[] = []
    const eq = new Map(db.equipos.map((e) => [e.id, e]))
    const cl = new Map(db.clientes.map((c) => [c.id, c]))
    const sv = new Map(db.servicios.map((s) => [s.id, s]))
    const push = (tipo: Alerta['tipo'], equipoId: number, vencISO: string) => {
      const e = eq.get(equipoId)
      if (!e || e.estado === 'BAJA') return
      if (clienteId && e.clienteId !== clienteId) return
      const v = vigencia(vencISO)
      if (v === 'VENCIDO' || v === 'POR_VENCER') {
        out.push({
          tipo, equipoId, equipo: `${e.tipo} ${e.fabricante} ${e.modelo}`,
          cliente: cl.get(e.clienteId)?.nombre ?? '', clienteId: e.clienteId,
          servicio: sv.get(e.servicioId)?.nombre ?? '', vencimientoISO: vencISO, estado: v,
        })
      }
    }
    for (const c of db.certificaciones) push('Certificación', c.equipoId, c.vencimientoISO)
    for (const m of db.mantenimientos) push('Mantenimiento', m.equipoId, m.proximoISO)
    return out.sort((a, b) => a.vencimientoISO.localeCompare(b.vencimientoISO))
  }, [db, clienteId])
}

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  GESTION: 'Gestión',
  TECNICO: 'Técnico',
  CLIENTE: 'Portal cliente',
}
