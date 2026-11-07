import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function useQrDataUrl(text: string, size = 128) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let alive = true
    QRCode.toDataURL(text, { width: size, margin: 1, color: { dark: '#0f232c', light: '#ffffff' } })
      .then((u) => { if (alive) setUrl(u) })
      .catch(() => { if (alive) setUrl('') })
    return () => { alive = false }
  }, [text, size])
  return url
}

export function Qr({ text, size = 128 }: { text: string; size?: number }) {
  const url = useQrDataUrl(text, size)
  if (!url) return <div style={{ width: size, height: size, borderRadius: 6, background: 'var(--surface-3)' }} />
  return <img src={url} width={size} height={size} alt={`QR ${text}`} />
}
