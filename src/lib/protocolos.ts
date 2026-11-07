import type { Equipo, ProtocoloItem } from './types'

/** Plantillas de protocolo de ensayo según el tipo de equipo. Valores de demostración. */
const SEGURIDAD: { label: string; limite: string }[] = [
  { label: 'Resistencia de puesta a tierra', limite: '≤ 0,30 Ω' },
  { label: 'Corriente de fuga a tierra', limite: '≤ 5,0 mA' },
  { label: 'Corriente de fuga por el envolvente', limite: '≤ 0,1 mA' },
  { label: 'Corriente de fuga de paciente', limite: '≤ 0,1 mA' },
  { label: 'Resistencia de aislación', limite: '≥ 2,0 MΩ' },
  { label: 'Inspección visual del cable de red', limite: 'Sin daños' },
]

const FUNCIONALES: Record<string, { label: string; limite: string }[]> = {
  'Ventilador pulmonar': [
    { label: 'Volumen corriente entregado', limite: '±10% del fijado' },
    { label: 'Presión de vía aérea', limite: '±2 cmH₂O' },
    { label: 'Frecuencia respiratoria', limite: '±1 rpm' },
    { label: 'Alarma de desconexión', limite: 'Opera' },
  ],
  'Bomba de infusión': [
    { label: 'Exactitud de caudal', limite: '±5%' },
    { label: 'Detección de oclusión', limite: 'Opera' },
    { label: 'Detección de aire en línea', limite: 'Opera' },
    { label: 'Alarma de batería baja', limite: 'Opera' },
  ],
  'Desfibrilador': [
    { label: 'Energía entregada (200 J)', limite: '±15%' },
    { label: 'Tiempo de carga', limite: '≤ 10 s' },
    { label: 'Sincronismo', limite: 'Opera' },
  ],
  'Electrobisturí': [
    { label: 'Potencia de corte', limite: '±20%' },
    { label: 'Potencia de coagulación', limite: '±20%' },
    { label: 'Alarma de placa neutra', limite: 'Opera' },
  ],
  'Monitor multiparamétrico': [
    { label: 'Exactitud de frecuencia cardíaca', limite: '±2 lpm' },
    { label: 'Exactitud de SpO₂', limite: '±2%' },
    { label: 'Alarmas de parámetros', limite: 'Operan' },
  ],
}

export function plantillaProtocolo(equipo: Equipo | null): { norma: string; items: ProtocoloItem[] } {
  const seg = SEGURIDAD.map((x) => ({ ...x, valor: '', ok: null }))
  const fun = (equipo && FUNCIONALES[equipo.tipo]) ? FUNCIONALES[equipo.tipo].map((x) => ({ ...x, valor: '', ok: null })) : []
  return { norma: 'IEC 62353 · Ensayo de seguridad eléctrica y funcional', items: [...seg, ...fun] }
}
