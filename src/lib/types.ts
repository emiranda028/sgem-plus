export type Role = 'ADMIN' | 'GESTION' | 'TECNICO' | 'CLIENTE'

export interface Usuario {
  id: number
  username: string
  nombre: string
  apellido: string
  email: string
  rol: Role
  clienteIds: number[] // para rol CLIENTE / portal
  color: string
}

export interface Contacto {
  nombre: string
  cargo: string
  email: string
  telefono: string
}

export interface Cliente {
  id: number
  nombre: string
  corto: string
  cuit: string
  direccion: string
  color: string
  contactos: Contacto[]
  portal: boolean
}

export interface Servicio {
  id: number
  clienteId: number
  nombre: string
  criticidad: 'ALTA' | 'MEDIA' | 'BAJA'
}

export type EstadoEquipo = 'OPERATIVO' | 'EN TALLER' | 'FUERA DE SERVICIO' | 'BAJA'

export interface Equipo {
  id: number
  qr: string
  clienteId: number
  servicioId: number
  tipo: string
  fabricante: string
  modelo: string
  serie: string
  estado: EstadoEquipo
  criticidad: 'ALTA' | 'MEDIA' | 'BAJA'
  pertenencia: 'Propio' | 'Comodato' | 'Alquilado' | 'Otros'
  ubicacion: string
  certificable: boolean
  mantenible: boolean
  altaISO: string
}

export type EstadoVig = 'VIGENTE' | 'POR_VENCER' | 'VENCIDO' | 'NA'

export interface Certificacion {
  id: number
  equipoId: number
  tipo: 'Seguridad eléctrica' | 'Funcional'
  numero: string
  fechaISO: string
  vencimientoISO: string
}

export interface Mantenimiento {
  id: number
  equipoId: number
  plan: string
  periodicidadMeses: number
  fechaISO: string
  proximoISO: string
}

export type TipoOS = 'Reparación' | 'Mantenimiento preventivo' | 'Certificación' | 'Instalación' | 'Provisión'
export type SituacionOS = 'Abierta' | 'En taller' | 'Esperando repuesto' | 'Presupuestar' | 'Lista' | 'Cerrada'

export type EstadoTarea = 'pendiente' | 'en_curso' | 'hecha'

export interface AccionOS {
  id: number
  fechaISO: string
  usuario: string
  nota: string
  tipo?: 'tarea' | 'nota'   // 'tarea' = tarea con estado; ausente/'nota' = registro de bitácora
  estado?: EstadoTarea      // sólo para tareas
  responsable?: string      // técnico asignado (sólo tareas)
  venceISO?: string         // fecha límite (sólo tareas)
}

export interface CertificadoEmitido {
  numero: string
  norma: string
  fechaISO: string
  vencimientoISO: string
  firmaDataUrl?: string
  firmante?: string
}

export interface OrdenServicio {
  id: number
  numero: string
  clienteId: number
  equipoId: number | null
  servicioId: number
  tipo: TipoOS
  titulo: string
  descripcion: string
  criticidad: 'ALTA' | 'MEDIA' | 'BAJA'
  situacion: SituacionOS
  taller: string
  tecnico: string
  aperturaISO: string
  cierreISO: string | null
  acciones: AccionOS[]
  fotos: number
  fotosData?: string[]
  firmaDataUrl?: string
  firmante?: string
  origen?: 'Interna' | 'Portal'
  protocolo?: Protocolo
  certificado?: CertificadoEmitido
  programadaISO?: string
}

export interface ProtocoloItem {
  label: string
  limite: string
  valor: string
  ok: boolean | null
}

export interface Protocolo {
  tipo: string
  norma: string
  items: ProtocoloItem[]
  realizadoPor: string
  fechaISO: string
  resultado: 'APTO' | 'NO APTO' | 'OBSERVADO'
}

export interface AuditLog {
  id: number
  fechaISO: string
  usuario: string
  accion: string
  detalle: string
}

export interface DB {
  version: number
  usuarios: Usuario[]
  clientes: Cliente[]
  servicios: Servicio[]
  equipos: Equipo[]
  certificaciones: Certificacion[]
  mantenimientos: Mantenimiento[]
  ordenes: OrdenServicio[]
  talleres: string[]
  auditoria: AuditLog[]
}
