import type { EstadoVig } from './types'

const f = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const fLong = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })

export const NOW = new Date('2026-11-07T12:00:00')
const DAY = 86400000

export const fecha = (isoStr?: string | null) => (isoStr ? f.format(new Date(isoStr)) : '—')
export const fechaLarga = (isoStr?: string | null) => (isoStr ? fLong.format(new Date(isoStr)) : '—')

export function diasHasta(isoStr?: string | null): number | null {
  if (!isoStr) return null
  return Math.round((new Date(isoStr).getTime() - NOW.getTime()) / DAY)
}
export function diasDesde(isoStr?: string | null): number | null {
  if (!isoStr) return null
  return Math.round((NOW.getTime() - new Date(isoStr).getTime()) / DAY)
}

export function vigencia(vencimientoISO?: string | null, umbral = 30): EstadoVig {
  if (!vencimientoISO) return 'NA'
  const d = diasHasta(vencimientoISO)
  if (d === null) return 'NA'
  if (d < 0) return 'VENCIDO'
  if (d <= umbral) return 'POR_VENCER'
  return 'VIGENTE'
}

export const VIG_LABEL: Record<EstadoVig, string> = {
  VIGENTE: 'Vigente',
  POR_VENCER: 'Por vencer',
  VENCIDO: 'Vencido',
  NA: 'No aplica',
}

export const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0)
export const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
export const money = (n: number) => n.toLocaleString('es-AR')

export function clean(v?: string | null) {
  if (!v) return ''
  return v.replace(/\r/g, '').trim()
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}
