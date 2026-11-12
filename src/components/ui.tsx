import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, AlertTriangle, Baby, BedDouble, ChevronRight, ClipboardList, FlaskConical, Gauge, HeartPulse,
  Inbox, Package, PackagePlus, Radiation, ScanLine, Stethoscope, Syringe, Wind, Wrench, Zap, ShieldCheck, CalendarClock,
} from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { EstadoEquipo, EstadoVig } from '../lib/types'
import { pct } from '../lib/format'

export function useIsMobile(bp = 760) {
  const [m, setM] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= bp : false))
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp}px)`)
    const on = () => setM(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [bp])
  return m
}

type LIcon = ComponentType<{ size?: number | string; className?: string }>

const EQ_ICON: { re: RegExp; icon: LIcon }[] = [
  { re: /ventilador|respirador/i, icon: Wind },
  { re: /bomba/i, icon: Syringe },
  { re: /desfibril|cardiodes/i, icon: HeartPulse },
  { re: /electrocardi|monitor/i, icon: Activity },
  { re: /electrobistur/i, icon: Zap },
  { re: /anestesia/i, icon: Gauge },
  { re: /autoclave|esteriliz/i, icon: FlaskConical },
  { re: /incubadora|neonat|cuna/i, icon: Baby },
  { re: /arco en c|rayos|tomograf|radiolog/i, icon: Radiation },
  { re: /ecograf|ultrason|doppler/i, icon: ScanLine },
  { re: /cama|camilla/i, icon: BedDouble },
  { re: /aspirador/i, icon: Wind },
]
export function iconEquipo(tipo: string): LIcon {
  return EQ_ICON.find((x) => x.re.test(tipo))?.icon ?? Stethoscope
}

const OS_ICON: Record<string, LIcon> = {
  'Reparación': Wrench,
  'Mantenimiento preventivo': CalendarClock,
  'Certificación': ShieldCheck,
  'Instalación': PackagePlus,
  'Provisión': Package,
}
export function iconOS(tipo: string): LIcon {
  return OS_ICON[tipo] ?? ClipboardList
}

export function IconTile({ icon: Icon, tone = 'brand', size = 40 }: { icon: LIcon; tone?: Tone; size?: number }) {
  return (
    <span className={`icon-tile tone-${tone}`} style={{ width: size, height: size }}>
      <Icon size={Math.round(size * 0.5)} />
    </span>
  )
}

type Tone = 'brand' | 'ok' | 'warn' | 'danger' | 'info' | 'accent' | 'neutral'

export function Badge({ children, tone = 'neutral', dot }: { children: ReactNode; tone?: Tone; dot?: boolean }) {
  return (
    <span className={`badge ${tone === 'neutral' ? '' : 'tone-' + tone}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  )
}

export function Kpi({ label, value, hint, tone = 'brand', icon, to }: { label: string; value: ReactNode; hint?: ReactNode; tone?: Tone; icon?: ReactNode; to?: string }) {
  const inner = (
    <>
      <div className="top">
        <span className="lbl">{label}</span>
        {icon && <span className="ic">{icon}</span>}
      </div>
      <div className="val mono">{value}</div>
      {hint && <div className="hint">{hint}{to && <ChevronRight size={13} className="kpi-go" />}</div>}
    </>
  )
  const cls = `kpi tone-${tone}${to ? ' kpi-link' : ''}`
  return to ? <Link to={to} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>
}

export function Progress({ value, tone = 'brand' }: { value: number; tone?: Tone }) {
  return (
    <div className={`progress tone-${tone}`}>
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

export function EmptyState({ icon, children = 'Sin datos para mostrar.' }: { icon?: ReactNode; children?: ReactNode }) {
  return (
    <div className="state">
      <span className="ic">{icon ?? <Inbox size={22} />}</span>
      <span>{children}</span>
    </div>
  )
}

export function ErrorState({ children }: { children: ReactNode }) {
  return (
    <div className="state" style={{ color: 'var(--danger)' }}>
      <span className="ic" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}><AlertTriangle size={22} /></span>
      <span>{children}</span>
    </div>
  )
}

const ESTADO_TONE: Record<EstadoEquipo, Tone> = {
  OPERATIVO: 'ok',
  'EN TALLER': 'warn',
  'FUERA DE SERVICIO': 'danger',
  BAJA: 'neutral',
}
export function EstadoBadge({ estado }: { estado: EstadoEquipo }) {
  return <Badge tone={ESTADO_TONE[estado]} dot>{estado}</Badge>
}

const VIG_TONE: Record<EstadoVig, Tone> = { VIGENTE: 'ok', POR_VENCER: 'warn', VENCIDO: 'danger', NA: 'neutral' }
const VIG_TXT: Record<EstadoVig, string> = { VIGENTE: 'Vigente', POR_VENCER: 'Por vencer', VENCIDO: 'Vencido', NA: 'No aplica' }
export function VigBadge({ estado }: { estado: EstadoVig }) {
  if (estado === 'NA') return <span className="faint small">No aplica</span>
  return <Badge tone={VIG_TONE[estado]}>{VIG_TXT[estado]}</Badge>
}

export function Donut({ rows, colors, center }: { rows: { name: string; value: number }[]; colors: string[]; center?: { top: string; bottom: string } }) {
  const total = rows.reduce((a, r) => a + r.value, 0)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 18, alignItems: 'center' }}>
      <div style={{ position: 'relative' }}>
        <ResponsiveContainer width="100%" height={170}>
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={2} stroke="var(--surface)" strokeWidth={2} isAnimationActive={false}>
              {rows.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => [`${v} (${pct(v, total)}%)`, '']} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        {center && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', textAlign: 'center', pointerEvents: 'none' }}>
            <strong style={{ fontFamily: 'var(--ff-d)', fontSize: 24 }}>{center.top}</strong>
            <small className="faint">{center.bottom}</small>
          </div>
        )}
      </div>
      <ul className="legend">
        {rows.map((r, i) => (
          <li key={r.name}>
            <i style={{ background: colors[i % colors.length] }} />
            <span className="muted">{r.name}</span>
            <span className="v mono">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export const CHART_COLORS = ['#0b4a44', '#a9792b', '#5f9a8f', '#a7382a', '#2f7d72', '#c08a2e', '#8ba39b']
