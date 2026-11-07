import type {
  Certificacion,
  Cliente,
  DB,
  Equipo,
  Mantenimiento,
  OrdenServicio,
  Servicio,
  Usuario,
} from './types'

// RNG determinista para que la demo sea siempre la misma
function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20261107)
const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)]
const chance = (p: number) => rnd() < p
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1))

const DAY = 86400000
const today = new Date('2026-11-07T12:00:00')
const iso = (d: Date) => d.toISOString()
const addDays = (base: Date, d: number) => new Date(base.getTime() + d * DAY)

const COLORS = ['#0e7490', '#4f46e5', '#0891b2', '#7c3aed', '#0d9488', '#db2777', '#ea580c', '#2563eb']

const CLIENTES_DEF: { nombre: string; corto: string }[] = [
  { nombre: 'Galeno San Isidro Fleming', corto: 'GAL' },
  { nombre: 'Sanatorio Trinidad San Isidro', corto: 'STI' },
  { nombre: 'Sanatorio Mater Dei', corto: 'MD' },
  { nombre: 'Hospital de Clínicas José de San Martín', corto: 'HC' },
  { nombre: 'CEMIC', corto: 'CEM' },
  { nombre: 'Sanatorio Güemes', corto: 'SG' },
  { nombre: 'Instituto de Oncología Ángel H. Roffo', corto: 'ROF' },
  { nombre: 'Clínica del Parque Centenario', corto: 'CPC' },
]

const SERVICIOS = [
  { n: 'Quirófano', c: 'ALTA' as const },
  { n: 'Terapia Intensiva', c: 'ALTA' as const },
  { n: 'Terapia Intermedia', c: 'ALTA' as const },
  { n: 'Internación', c: 'MEDIA' as const },
  { n: 'Guardia', c: 'ALTA' as const },
  { n: 'Laboratorio', c: 'MEDIA' as const },
  { n: 'Diagnóstico por Imágenes', c: 'MEDIA' as const },
  { n: 'Consultorios Externos', c: 'BAJA' as const },
  { n: 'Neonatología', c: 'ALTA' as const },
  { n: 'Hemodinamia', c: 'ALTA' as const },
]

const TIPOS = [
  { t: 'Monitor multiparamétrico', fab: ['Mindray', 'Philips', 'GE'], cert: true, mant: true },
  { t: 'Ventilador pulmonar', fab: ['Maquet', 'Dräger', 'Hamilton'], cert: true, mant: true },
  { t: 'Bomba de infusión', fab: ['B. Braun', 'Baxter', 'Medcaptain'], cert: true, mant: true },
  { t: 'Electrobisturí', fab: ['Valleylab', 'Erbe', 'WEM'], cert: true, mant: true },
  { t: 'Desfibrilador', fab: ['Philips', 'Zoll', 'GE'], cert: true, mant: true },
  { t: 'Cardiodesfibrilador', fab: ['Zoll', 'Philips'], cert: true, mant: true },
  { t: 'Mesa de anestesia', fab: ['Dräger', 'GE', 'Maquet'], cert: true, mant: true },
  { t: 'Electrocardiógrafo', fab: ['GE', 'Schiller', 'Mortara'], cert: true, mant: false },
  { t: 'Autoclave', fab: ['Scican', 'Tuttnauer'], cert: true, mant: true },
  { t: 'Incubadora neonatal', fab: ['Dräger', 'GE', 'Fanem'], cert: true, mant: true },
  { t: 'Arco en C', fab: ['Philips', 'Siemens', 'GE'], cert: true, mant: true },
  { t: 'Ecógrafo', fab: ['GE', 'Philips', 'Mindray'], cert: false, mant: true },
  { t: 'Bomba de jeringa', fab: ['B. Braun', 'Terumo'], cert: true, mant: false },
  { t: 'Cama hospitalaria', fab: ['Hill-Rom', 'Quiromed'], cert: false, mant: false },
  { t: 'Aspirador', fab: ['Silfab', 'Gadmed'], cert: false, mant: true },
]

const MODELOS: Record<string, string[]> = {
  Mindray: ['uMEC12', 'BeneVision N22', 'iPM10'],
  Philips: ['MP40', 'IntelliVue MX450', 'HeartStart'],
  GE: ['B125', 'Carescape R860', 'Logiq E'],
  Maquet: ['Servo S', 'Servo I', 'Flow-i'],
  Dräger: ['Evita V500', 'Fabius', 'Babyleo'],
  Hamilton: ['C1', 'G5'],
  'B. Braun': ['Infusomat', 'Perfusor'],
  Baxter: ['Sigma Spectrum'],
  Medcaptain: ['MP-60'],
  Valleylab: ['Force FX', 'FT10'],
  Erbe: ['VIO 300D'],
  WEM: ['SS-501'],
  Zoll: ['R Series', 'X Series'],
  Scican: ['Statim 2000'],
  Tuttnauer: ['3870EA'],
  Fanem: ['C-186'],
  Siemens: ['Cios Alpha'],
  Schiller: ['AT-102'],
  Mortara: ['ELI 250'],
  Terumo: ['TE-331'],
  'Hill-Rom': ['Progressa'],
  Quiromed: ['Mega ICU'],
  Silfab: ['N33-A'],
  Gadmed: ['A-500'],
}

const NOMBRES = ['Pablo', 'Eliana', 'Alejandro', 'María', 'Lucía', 'Diego', 'Sofía', 'Martín', 'Carla', 'Federico']
const APELLIDOS = ['Quiroga', 'Reniero', 'Acosta', 'Gómez', 'Pérez', 'Molina', 'Suárez', 'Torres', 'Díaz', 'Romero']

function serie() {
  const L = 'ABCDEFGHJKLMNPRSTUVWXYZ'
  let s = ''
  for (let i = 0; i < 2; i++) s += L[int(0, L.length - 1)]
  s += int(10000000, 99999999)
  return s
}

export function buildSeed(): DB {
  const clientes: Cliente[] = CLIENTES_DEF.map((c, i) => ({
    id: i + 1,
    nombre: c.nombre,
    corto: c.corto,
    cuit: `30-${int(60000000, 71999999)}-${int(0, 9)}`,
    direccion: `${pick(['Av. Santa Fe', 'Av. Córdoba', 'Dr. A. Fleming', 'Av. Pueyrredón', 'Juncal'])} ${int(500, 4500)}`,
    color: COLORS[i % COLORS.length],
    portal: true,
    contactos: [
      {
        nombre: `${pick(NOMBRES)} ${pick(APELLIDOS)}`,
        cargo: pick(['Jefe de Mantenimiento', 'Ingeniería Clínica', 'Compras', 'Dirección Médica']),
        email: `contacto@${c.corto.toLowerCase()}.com.ar`,
        telefono: `11-${int(4000, 6999)}-${int(1000, 9999)}`,
      },
    ],
  }))

  const servicios: Servicio[] = []
  let sid = 1
  for (const cl of clientes) {
    const n = int(5, SERVICIOS.length)
    const shuffled = [...SERVICIOS].sort(() => rnd() - 0.5).slice(0, n)
    for (const s of shuffled) servicios.push({ id: sid++, clienteId: cl.id, nombre: s.n, criticidad: s.c })
  }

  const equipos: Equipo[] = []
  const certificaciones: Certificacion[] = []
  const mantenimientos: Mantenimiento[] = []
  let eid = 1
  let cid = 1
  let mid = 1
  for (const cl of clientes) {
    const servs = servicios.filter((s) => s.clienteId === cl.id)
    const total = int(28, 55)
    for (let k = 0; k < total; k++) {
      const serv = pick(servs)
      const def = pick(TIPOS)
      const fab = pick(def.fab)
      const modelo = pick(MODELOS[fab] ?? ['—'])
      const estadoRoll = rnd()
      const estado =
        estadoRoll < 0.78 ? 'OPERATIVO' : estadoRoll < 0.9 ? 'EN TALLER' : estadoRoll < 0.97 ? 'FUERA DE SERVICIO' : 'BAJA'
      const e: Equipo = {
        id: eid,
        qr: `SGEM-${String(eid).padStart(6, '0')}`,
        clienteId: cl.id,
        servicioId: serv.id,
        tipo: def.t,
        fabricante: fab,
        modelo,
        serie: serie(),
        estado,
        criticidad: serv.criticidad,
        pertenencia: chance(0.6) ? 'Propio' : pick(['Comodato', 'Alquilado', 'Otros']),
        ubicacion: `${serv.nombre} · Box ${int(1, 12)}`,
        certificable: def.cert,
        mantenible: def.mant,
        altaISO: iso(addDays(today, -int(120, 1500))),
      }
      equipos.push(e)
      if (def.cert) {
        const offset = int(-200, 150) // algunos vencidos, otros vigentes
        const fecha = addDays(today, offset - 365)
        const venc = addDays(fecha, 365)
        certificaciones.push({
          id: cid++,
          equipoId: e.id,
          tipo: 'Seguridad eléctrica',
          numero: String(int(8000, 9999)),
          fechaISO: iso(fecha),
          vencimientoISO: iso(venc),
        })
      }
      if (def.mant) {
        const per = pick([3, 6, 12])
        const offset = int(-120, 90)
        const fecha = addDays(today, offset - per * 30)
        const prox = addDays(fecha, per * 30)
        mantenimientos.push({
          id: mid++,
          equipoId: e.id,
          plan: `Plan ${per}M`,
          periodicidadMeses: per,
          fechaISO: iso(fecha),
          proximoISO: iso(prox),
        })
      }
      eid++
    }
  }

  const talleres = ['San Isidro', 'Central CABA', 'Rosario']
  const tecnicos = ['pablo.quiroga', 'alejandro.acosta', 'diego.molina']

  const ordenes: OrdenServicio[] = []
  const tiposOS: OrdenServicio['tipo'][] = ['Reparación', 'Mantenimiento preventivo', 'Certificación', 'Instalación', 'Provisión']
  const situaciones: OrdenServicio['situacion'][] = ['Abierta', 'En taller', 'Esperando repuesto', 'Presupuestar', 'Lista', 'Cerrada']
  const descs = [
    'No enciende',
    'Falla en pantalla',
    'Alarma intermitente',
    'Pérdida de presión',
    'Batería agotada',
    'Mantenimiento programado',
    'Calibración requerida',
    'Sensor dañado',
  ]
  for (let i = 0; i < 90; i++) {
    const e = pick(equipos)
    const tipo = pick(tiposOS)
    const abierta = chance(0.45)
    const apertura = addDays(today, -int(1, 240))
    const situ = abierta ? pick(situaciones.slice(0, 5)) : 'Cerrada'
    const cierre = abierta ? null : addDays(apertura, int(2, 40))
    const num = `OS-${apertura.getFullYear()}${String(apertura.getMonth() + 1).padStart(2, '0')}${String(1000 + i)}`
    const tecnico = pick(tecnicos)
    const acciones = [
      { id: 1, fechaISO: iso(apertura), usuario: tecnico, nota: 'Orden abierta. ' + pick(descs) },
    ]
    if (!abierta && cierre) acciones.push({ id: 2, fechaISO: iso(cierre), usuario: tecnico, nota: 'Trabajo finalizado y equipo entregado.' })
    ordenes.push({
      id: i + 1,
      numero: num,
      clienteId: e.clienteId,
      equipoId: e.id,
      servicioId: e.servicioId,
      tipo,
      titulo: `${tipo}: ${e.tipo} ${e.fabricante}`,
      descripcion: pick(descs),
      criticidad: e.criticidad,
      situacion: situ,
      taller: pick(talleres),
      tecnico,
      aperturaISO: iso(apertura),
      cierreISO: cierre ? iso(cierre) : null,
      acciones,
      fotos: int(0, 4),
      firmaDataUrl: !abierta && chance(0.5) ? 'signed' : undefined,
      firmante: !abierta && chance(0.5) ? `${pick(NOMBRES)} ${pick(APELLIDOS)}` : undefined,
    })
  }
  ordenes.sort((a, b) => b.aperturaISO.localeCompare(a.aperturaISO))

  const usuarios: Usuario[] = [
    { id: 1, username: 'admin', nombre: 'Emiliano', apellido: 'Miranda', email: 'admin@biotrust.com.ar', rol: 'ADMIN', clienteIds: [], color: '#0e7490' },
    { id: 2, username: 'gestion', nombre: 'Eliana', apellido: 'Reniero', email: 'gestion@biotrust.com.ar', rol: 'GESTION', clienteIds: [], color: '#4f46e5' },
    { id: 3, username: 'tecnico', nombre: 'Pablo', apellido: 'Quiroga', email: 'tecnico@biotrust.com.ar', rol: 'TECNICO', clienteIds: [], color: '#0891b2' },
    { id: 4, username: 'cliente', nombre: 'Lucía', apellido: 'Gómez', email: 'ing.clinica@galeno.com', rol: 'CLIENTE', clienteIds: [1], color: '#0d9488' },
  ]

  return {
    version: 3,
    usuarios,
    clientes,
    servicios,
    equipos,
    certificaciones,
    mantenimientos,
    ordenes,
    talleres,
    auditoria: [
      { id: 1, fechaISO: iso(addDays(today, -1)), usuario: 'gestion', accion: 'Exportó', detalle: 'Inventario de equipos (Galeno)' },
      { id: 2, fechaISO: iso(addDays(today, -1)), usuario: 'tecnico', accion: 'Cerró OS', detalle: 'OS de reparación' },
    ],
  }
}
