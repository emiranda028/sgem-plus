import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ONDA, reducedMotion, useCountUp, type Onda } from '../lib/motion'

const VERDE = '#37e69a', CELESTE = '#5cc8ff', AMBAR = '#ffc857', ROJO = '#ff6b5e'

/**
 * Traza con barrido, como un monitor de paciente: el cursor avanza de izquierda
 * a derecha y borra por delante. `amp` (0..1) escala la señal: indicador bajo,
 * señal débil.
 */
export function Trace({ kind, color, amp, height }: { kind: Onda; color: string; amp: number; height: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const { fn, ciclo } = ONDA[kind]
    const a = 0.16 + 0.84 * Math.max(0, Math.min(1, amp))
    const PPS = 62 // píxeles por segundo
    let w = 0, x = 0, t = Math.random() * ciclo, prevY = 0, raf = 0, last = 0

    const yAt = (tt: number) => {
      const v = fn((tt / ciclo) % 1)
      const base = kind === 'ecg' ? height * 0.66 : height * 0.82
      return base - v * a * height * (kind === 'ecg' ? 0.52 : 0.62)
    }
    const estilo = () => { ctx.strokeStyle = color; ctx.lineWidth = 1.7; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.shadowColor = color; ctx.shadowBlur = 7 }
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      w = cv.clientWidth
      cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      estilo()
      // precarga: traza completa para que nunca arranque vacío
      ctx.clearRect(0, 0, w, height)
      ctx.beginPath()
      for (let i = 0; i <= w; i++) { const y = yAt(t + i / PPS); i ? ctx.lineTo(i, y) : ctx.moveTo(i, y) }
      ctx.stroke()
      t += w / PPS; x = 0; prevY = yAt(t)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(cv)
    if (reducedMotion()) return () => ro.disconnect()

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now
      let steps = Math.round(PPS * dt)
      while (steps-- > 0) {
        const nx = x + 1
        t += 1 / PPS
        const y = yAt(t)
        ctx.shadowBlur = 0
        ctx.clearRect(nx, 0, 16, height) // hueco de barrido
        ctx.shadowBlur = 7
        ctx.beginPath(); ctx.moveTo(x, prevY); ctx.lineTo(nx, y); ctx.stroke()
        x = nx; prevY = y
        if (x >= w) { x = 0 }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [kind, color, amp, height])
  return <canvas ref={ref} style={{ height }} aria-hidden />
}

function Reloj() {
  const [n, setN] = useState(() => new Date())
  useEffect(() => { const i = setInterval(() => setN(new Date()), 1000); return () => clearInterval(i) }, [])
  return <span>{n.toLocaleTimeString('es-AR', { hour12: false })}</span>
}

function Lectura({ k, v, s }: { k: string; v: number; s: string }) {
  const n = useCountUp(v)
  return (
    <div className="vt-read">
      <div className="k">{k}</div>
      <div className="v">{n}<small>%</small></div>
      <div className="s">{s}</div>
    </div>
  )
}

export interface VitalsData {
  titulo: string
  cert: { pct: number; ok: number; total: number }
  prev: { pct: number; ok: number; total: number }
  disp: { pct: number; ok: number; total: number }
  vencidos: number
}

/** Banda "signos vitales del parque": índice de salud + tres trazas vivas. */
export default function VitalsBand({ titulo, cert, prev, disp, vencidos }: VitalsData) {
  const salud = Math.round(cert.pct * 0.4 + prev.pct * 0.3 + disp.pct * 0.3)
  const n = useCountUp(salud, 1100)
  // Mismo semáforo que el resto de la app: verde desde 80, ámbar desde 50.
  const tono = salud >= 80 ? VERDE : salud >= 50 ? AMBAR : ROJO
  const estado = salud >= 80 ? 'Estable' : salud >= 50 ? 'En observación' : 'Requiere atención'
  const [arc, setArc] = useState(0)
  useEffect(() => { const r = requestAnimationFrame(() => setArc(salud)); return () => cancelAnimationFrame(r) }, [salud])
  const [h, setH] = useState(() => (typeof window !== 'undefined' && window.innerWidth <= 760 ? 62 : 74))
  useEffect(() => { const f = () => setH(window.innerWidth <= 760 ? 62 : 74); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f) }, [])
  const C = 2 * Math.PI * 52

  return (
    <section className="vt" aria-label="Signos vitales del parque">
      <div className="vt-top"><span>Signos vitales del parque · {titulo}</span><Reloj /></div>
      <div className="vt-main">
        <div className="vt-health">
          <div className="vt-ring" style={{ color: tono }}>
            <svg viewBox="0 0 120 120" width="100%" height="100%">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="7" />
              <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - arc / 100)} style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)', filter: 'drop-shadow(0 0 6px currentColor)' }} />
            </svg>
            <div className="c"><div className="n">{n}</div><div className="l">SALUD</div></div>
          </div>
          <div className="vt-state">
            <b style={{ color: tono }}>{estado}</b>
            <span>Índice ponderado de certificación, preventivo y disponibilidad.</span>
            {vencidos > 0 && <Link to="/vencimientos" className="vt-alarm"><i />{vencidos} vencimiento{vencidos === 1 ? '' : 's'} sin atender</Link>}
          </div>
        </div>
        <div className="vt-rows">
          <Link to="/vencimientos" className="vt-row" style={{ ['--c' as string]: VERDE }}>
            <Trace kind="ecg" color={VERDE} amp={cert.pct / 100} height={h} />
            <Lectura k="Certificación" v={cert.pct} s={`${cert.ok}/${cert.total} vigentes`} />
          </Link>
          <Link to="/vencimientos" className="vt-row" style={{ ['--c' as string]: CELESTE }}>
            <Trace kind="pleth" color={CELESTE} amp={prev.pct / 100} height={h} />
            <Lectura k="Preventivo" v={prev.pct} s={`${prev.ok}/${prev.total} al día`} />
          </Link>
          <Link to="/taller" className="vt-row" style={{ ['--c' as string]: AMBAR }}>
            <Trace kind="resp" color={AMBAR} amp={disp.pct / 100} height={h} />
            <Lectura k="Disponibilidad" v={disp.pct} s={`${disp.ok}/${disp.total} operativos`} />
          </Link>
        </div>
      </div>
    </section>
  )
}

/** Fondo del login: trazas que fluyen en profundidad. */
export function HeroTraces() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const capas: { kind: Onda; y: number; amp: number; vel: number; alpha: number; lw: number; esc: number }[] = [
      { kind: 'resp', y: 0.2, amp: 60, vel: 22, alpha: 0.1, lw: 1.2, esc: 150 },
      { kind: 'pleth', y: 0.1, amp: 34, vel: 38, alpha: 0.13, lw: 1.3, esc: 120 },
      { kind: 'ecg', y: 0.95, amp: 62, vel: 60, alpha: 0.5, lw: 1.8, esc: 100 },
    ]
    let w = 0, h = 0, raf = 0
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      w = cv.clientWidth; h = cv.clientHeight
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const draw = (now: number) => {
      ctx.clearRect(0, 0, w, h)
      for (const c of capas) {
        const { fn, ciclo } = ONDA[c.kind]
        ctx.beginPath()
        for (let x = 0; x <= w; x += 2) {
          const tt = (x + (now / 1000) * c.vel) / c.esc
          const y = h * c.y - fn((tt / ciclo) % 1) * c.amp
          x ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
        }
        ctx.strokeStyle = `rgba(190,225,255,${c.alpha})`; ctx.lineWidth = c.lw
        ctx.shadowColor = 'rgba(140,200,255,.9)'; ctx.shadowBlur = c.kind === 'ecg' ? 12 : 0
        ctx.stroke()
      }
      if (!reducedMotion()) raf = requestAnimationFrame(draw)
    }
    fit(); draw(0)
    const ro = new ResizeObserver(() => { fit(); if (reducedMotion()) draw(0) })
    ro.observe(cv)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [])
  return <canvas ref={ref} className="hero-traces" aria-hidden />
}
