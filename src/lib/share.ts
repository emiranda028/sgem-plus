import html2canvas from 'html2canvas'
import { exportCsv } from './csv'

export { exportCsv }

function esc(s: string) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] ?? c))
}

export interface ShareItem { titulo: string; lineas: string[] }

/**
 * Genera una imagen PNG, limpia y con marca, de los ítems seleccionados y la
 * comparte con el menú nativo del dispositivo (o la descarga como fallback).
 * Se renderiza siempre en claro para que se vea bien al compartir.
 */
export async function shareSelectionImage(opts: { title: string; subtitle?: string; items: ShareItem[]; filename: string }) {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'position:fixed;left:-99999px;top:0;width:600px;padding:28px 30px;background:#ffffff;font-family:Inter,system-ui,sans-serif;color:#0c1a22;box-sizing:border-box;'
  wrap.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:34px;height:34px;border-radius:9px;background:linear-gradient(145deg,#086173,#15a6bf);"></div>
      <div style="font-family:'Schibsted Grotesk',system-ui,sans-serif;font-weight:800;font-size:20px;letter-spacing:-.02em;">SGEM <span style="color:#1b39c4;">Plus</span></div>
    </div>
    <div style="font-weight:800;font-size:23px;letter-spacing:-.02em;margin-top:16px;">${esc(opts.title)}</div>
    ${opts.subtitle ? `<div style="color:#4f636e;font-size:14px;margin-top:3px;">${esc(opts.subtitle)}</div>` : ''}
    <div style="display:grid;gap:10px;margin-top:18px;">
      ${opts.items.map((it) => `
        <div style="border:1px solid #e2e8ec;border-radius:12px;padding:12px 14px;">
          <div style="font-weight:650;font-size:15px;letter-spacing:-.01em;">${esc(it.titulo)}</div>
          ${it.lineas.filter(Boolean).map((l) => `<div style="color:#4f636e;font-size:13px;margin-top:3px;">${esc(l)}</div>`).join('')}
        </div>`).join('')}
    </div>
    <div style="color:#8496a0;font-size:11px;margin-top:20px;">${opts.items.length} ítem(s) · Generado con SGEM Plus · ${new Date().toLocaleDateString('es-AR')}</div>
  `
  document.body.appendChild(wrap)
  try {
    const canvas = await html2canvas(wrap, { scale: 2, backgroundColor: '#ffffff', logging: false })
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), 'image/png'))
    if (!blob) return
    const file = new File([blob], opts.filename, { type: 'image/png' })
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean; share?: (d: unknown) => Promise<void> }
    if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
      try { await nav.share({ files: [file], title: opts.title }); return } catch { /* cancelado/no soportado → descarga */ }
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = opts.filename; a.click(); URL.revokeObjectURL(url)
  } finally {
    document.body.removeChild(wrap)
  }
}
