import { useEffect, useRef } from 'react'

/** Pad de firma a mano alzada. Llama onChange con el dataURL (o '' si está vacío). */
export default function Signature({ onChange }: { onChange: (dataUrl: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const dirty = useRef(false)

  useEffect(() => {
    const canvas = ref.current!
    const ratio = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    const ctx = canvas.getContext('2d')!
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f232c'

    const pos = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const down = (e: PointerEvent) => {
      drawing.current = true
      dirty.current = true
      const { x, y } = pos(e)
      ctx.beginPath()
      ctx.moveTo(x, y)
      canvas.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      if (!drawing.current) return
      const { x, y } = pos(e)
      ctx.lineTo(x, y)
      ctx.stroke()
    }
    const up = () => {
      if (!drawing.current) return
      drawing.current = false
      onChange(dirty.current ? canvas.toDataURL('image/png') : '')
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointerleave', up)
    return () => {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointerleave', up)
    }
  }, [onChange])

  const clear = () => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    dirty.current = false
    onChange('')
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <canvas ref={ref} className="sigpad" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="faint small">Firmá con el dedo o el mouse</span>
        <button type="button" className="btn ghost sm" onClick={clear}>Borrar</button>
      </div>
    </div>
  )
}
