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
  const N = "'Barlow Condensed','Schibsted Grotesk',system-ui,sans-serif"
  const M = "'Martian Mono',ui-monospace,monospace"
  wrap.style.cssText = "position:fixed;left:-99999px;top:0;width:600px;padding:30px 32px 26px;background:#f6f6f3;font-family:'Schibsted Grotesk',system-ui,sans-serif;color:#0b0c0e;box-sizing:border-box;"
  wrap.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:26px;height:26px;background:#1b39c4;"></div>
        <div style="font-family:${N};font-weight:700;font-size:26px;line-height:1;text-transform:uppercase;">SGEM <span style="font-family:${M};font-weight:500;font-size:9px;letter-spacing:3px;vertical-align:4px;">PLUS</span></div>
      </div>
      <div style="font-family:${M};font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#55585f;">${new Date().toLocaleDateString('es-AR')}</div>
    </div>
    <div style="font-family:${N};font-weight:700;font-size:44px;line-height:.92;text-transform:uppercase;margin-top:20px;">${esc(opts.title)}</div>
    ${opts.subtitle ? `<div style="font-family:${M};font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#55585f;margin-top:9px;">${esc(opts.subtitle)}</div>` : ''}
    <div style="border-top:2px solid #0b0c0e;margin-top:16px;">
      ${opts.items.map((it, n) => `
        <div style="display:flex;gap:14px;border-bottom:1px solid #c9cbd1;padding:12px 0 13px;">
          <div style="font-family:${M};font-size:10px;color:#55585f;padding-top:4px;width:22px;flex:none;">${String(n + 1).padStart(2, '0')}</div>
          <div style="min-width:0;">
            <div style="font-weight:700;font-size:15px;">${esc(it.titulo)}</div>
            ${it.lineas.filter(Boolean).map((l) => `<div style="font-family:${M};font-size:10px;letter-spacing:.3px;text-transform:uppercase;color:#55585f;margin-top:5px;">${esc(l)}</div>`).join('')}
          </div>
        </div>`).join('')}
    </div>
    <div style="font-family:${M};font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#8a8d94;margin-top:16px;">${opts.items.length} ítem(s) · generado con SGEM Plus</div>
  `
  document.body.appendChild(wrap)
  try {
    const canvas = await html2canvas(wrap, { scale: 2, backgroundColor: '#f6f6f3', logging: false })
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
