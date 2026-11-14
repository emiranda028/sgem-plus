import { useEffect, useState } from 'react'

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Cuenta de 0 al valor con desaceleración; respeta "reducir movimiento". */
export function useCountUp(target: number, ms = 900) {
  const [v, setV] = useState(() => (reducedMotion() ? target : 0))
  useEffect(() => {
    if (reducedMotion()) { setV(target); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms)
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

/* ---- Formas de onda (fase 0..1 por ciclo, salida ≈ -0.25..1) ---- */
const g = (p: number, c: number, w: number, a: number) => a * Math.exp(-((p - c) ** 2) / (2 * w * w))

export type Onda = 'ecg' | 'pleth' | 'resp'

export const ONDA: Record<Onda, { fn: (p: number) => number; ciclo: number }> = {
  // Complejo PQRST
  ecg: { ciclo: 0.95, fn: (p) => g(p, 0.2, 0.028, 0.13) + g(p, 0.355, 0.009, -0.12) + g(p, 0.385, 0.011, 1) + g(p, 0.418, 0.011, -0.24) + g(p, 0.64, 0.05, 0.27) },
  // Pletismografía: subida rápida y muesca dícrota
  pleth: { ciclo: 0.95, fn: (p) => g(p, 0.24, 0.075, 1) + g(p, 0.5, 0.1, 0.38) },
  // Respiración
  resp: { ciclo: 3.4, fn: (p) => 0.5 - 0.5 * Math.cos(2 * Math.PI * p) },
}
