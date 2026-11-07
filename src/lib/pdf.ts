import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import type { Cliente, Equipo, OrdenServicio, Protocolo } from './types'
import { fechaLarga } from './format'

const BRAND: [number, number, number] = [14, 116, 144]
const INK: [number, number, number] = [15, 35, 44]
const SOFT: [number, number, number] = [120, 140, 148]

function header(doc: jsPDF, titulo: string, sub: string) {
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, 210, 30, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('SGEM', 16, 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('BIOTRUST · Gestión de Equipamiento Médico', 16, 21)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(titulo, 194, 15, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(sub, 194, 21, { align: 'right' })
}

function footer(doc: jsPDF) {
  doc.setDrawColor(224, 231, 233)
  doc.line(16, 282, 194, 282)
  doc.setTextColor(...SOFT)
  doc.setFontSize(7.5)
  doc.text('SGEM Plus · Documento generado automáticamente · biotrust-sgem', 16, 287)
  doc.text(fechaLarga(new Date().toISOString()), 194, 287, { align: 'right' })
}

function kv(doc: jsPDF, x: number, y: number, k: string, v: string) {
  doc.setTextColor(...SOFT)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text(k.toUpperCase(), x, y)
  doc.setTextColor(...INK)
  doc.setFontSize(10.5)
  doc.setFont('helvetica', 'bold')
  doc.text(v || '—', x, y + 5.5)
}

async function qrDataUrl(text: string) {
  return QRCode.toDataURL(text, { width: 200, margin: 1, color: { dark: '#0f232c', light: '#ffffff' } })
}

export async function remitoPDF(o: OrdenServicio, equipo: Equipo | null, cliente: Cliente) {
  const doc = new jsPDF()
  header(doc, 'REMITO DE SERVICIO', o.numero)
  let y = 44
  doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
  doc.text(o.titulo, 16, y)
  y += 10
  kv(doc, 16, y, 'Cliente', cliente.nombre)
  kv(doc, 110, y, 'Fecha', fechaLarga(o.aperturaISO))
  y += 16
  kv(doc, 16, y, 'Tipo de orden', o.tipo)
  kv(doc, 110, y, 'Taller', o.taller)
  y += 16
  if (equipo) {
    kv(doc, 16, y, 'Equipo', `${equipo.tipo} · ${equipo.fabricante} ${equipo.modelo}`)
    kv(doc, 110, y, 'N° de serie', equipo.serie)
    y += 16
  }
  doc.setTextColor(...SOFT); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal')
  doc.text('DESCRIPCIÓN / TRABAJOS REALIZADOS', 16, y); y += 6
  doc.setTextColor(...INK); doc.setFontSize(10)
  const lines = doc.splitTextToSize((o.descripcion || '') + '\n\n' + o.acciones.map((a) => `• ${a.nota}`).join('\n'), 178)
  doc.text(lines, 16, y)
  y += lines.length * 5 + 16

  if (equipo) {
    const qr = await qrDataUrl(equipo.qr)
    doc.addImage(qr, 'PNG', 16, 232, 26, 26)
    doc.setTextColor(...SOFT); doc.setFontSize(7.5)
    doc.text(equipo.qr, 16, 262)
  }
  // Firma
  doc.setDrawColor(207, 217, 220)
  doc.line(120, 258, 194, 258)
  if (o.firmaDataUrl && o.firmaDataUrl.startsWith('data:')) {
    try { doc.addImage(o.firmaDataUrl, 'PNG', 128, 232, 60, 24) } catch { /* ignore */ }
  }
  doc.setTextColor(...SOFT); doc.setFontSize(8)
  doc.text(`Conforme · ${o.firmante || 'Recepción del cliente'}`, 120, 263)
  footer(doc)

  // Anexo fotográfico
  const fotos = (o.fotosData ?? []).filter((f) => f.startsWith('data:'))
  if (fotos.length) {
    doc.addPage()
    header(doc, 'ANEXO FOTOGRÁFICO', o.numero)
    doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
    doc.text('Registro fotográfico del servicio', 16, 44)
    const cols = 2, w = 86, h = 64, gapX = 6, gapY = 8, x0 = 16, y0 = 52
    fotos.slice(0, 8).forEach((src, i) => {
      const col = i % cols, row = Math.floor(i / cols)
      const x = x0 + col * (w + gapX), y = y0 + row * (h + gapY)
      try {
        doc.setDrawColor(224, 231, 233); doc.roundedRect(x, y, w, h, 2, 2, 'S')
        doc.addImage(src, 'JPEG', x + 1, y + 1, w - 2, h - 2)
      } catch { /* ignore */ }
    })
    footer(doc)
  }
  doc.save(`Remito_${o.numero}.pdf`)
}

/** La fuente estándar de jsPDF (WinAnsi) no tiene ≤, Ω, ±, subíndices: los pasamos a ASCII. */
function ascii(s: string) {
  return s
    .replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/±/g, '+/-')
    .replace(/Ω/g, ' ohm').replace(/µ/g, 'u').replace(/°/g, 'deg')
    .replace(/₂/g, '2').replace(/₃/g, '3').replace(/²/g, '2').replace(/³/g, '3')
}

export async function informeEnsayoPDF(o: OrdenServicio, equipo: Equipo | null, cliente: Cliente, pr: Protocolo) {
  const doc = new jsPDF()
  header(doc, 'INFORME DE ENSAYO', o.numero)
  let y = 44
  doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
  doc.text(pr.tipo, 16, y); y += 6
  doc.setTextColor(...SOFT); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
  doc.text(pr.norma, 16, y); y += 12
  kv(doc, 16, y, 'Cliente', cliente.nombre); kv(doc, 110, y, 'Fecha', fechaLarga(pr.fechaISO)); y += 16
  if (equipo) { kv(doc, 16, y, 'Equipo', `${equipo.tipo} · ${equipo.fabricante} ${equipo.modelo}`); kv(doc, 110, y, 'N° de serie', equipo.serie); y += 16 }

  // Tabla de ensayos
  const x0 = 16, w = 178
  doc.setFillColor(11, 122, 144); doc.rect(x0, y, w, 8, 'F')
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
  doc.text('ENSAYO', x0 + 3, y + 5.5); doc.text('LÍMITE', x0 + 95, y + 5.5); doc.text('MEDIDO', x0 + 130, y + 5.5); doc.text('RESULTADO', x0 + 155, y + 5.5)
  y += 8
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
  for (const it of pr.items) {
    doc.setDrawColor(224, 231, 233); doc.line(x0, y + 7, x0 + w, y + 7)
    doc.setTextColor(...INK); doc.text(doc.splitTextToSize(ascii(it.label), 88), x0 + 3, y + 5)
    doc.setTextColor(...SOFT); doc.text(ascii(it.limite), x0 + 95, y + 5)
    doc.setTextColor(...INK); doc.text(ascii(it.valor || '—'), x0 + 130, y + 5)
    const okCol: [number, number, number] = it.ok === true ? [16, 137, 62] : it.ok === false ? [210, 59, 50] : [120, 140, 148]
    doc.setTextColor(...okCol); doc.setFont('helvetica', 'bold')
    doc.text(it.ok === true ? 'APTO' : it.ok === false ? 'NO APTO' : 'N/A', x0 + 155, y + 5)
    doc.setFont('helvetica', 'normal')
    y += 7.5
  }
  y += 8
  const rc: [number, number, number] = pr.resultado === 'APTO' ? [16, 137, 62] : pr.resultado === 'NO APTO' ? [210, 59, 50] : [191, 116, 8]
  doc.setFillColor(rc[0], rc[1], rc[2]); doc.roundedRect(x0, y, 60, 14, 2, 2, 'F')
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
  doc.text(`RESULTADO: ${pr.resultado}`, x0 + 6, y + 9)

  doc.setTextColor(...SOFT); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
  doc.text(`Realizado por: ${pr.realizadoPor}`, 110, y + 6)
  doc.setDrawColor(207, 217, 220); doc.line(110, y + 28, 184, y + 28)
  doc.text('Firma del responsable técnico', 110, y + 33)
  footer(doc)
  doc.save(`Informe_ensayo_${o.numero}.pdf`)
}

export async function etiquetasPDF(equipos: Equipo[], clienteNombre: string) {
  const doc = new jsPDF()
  // precalcular QRs
  const qrs = new Map<number, string>()
  for (const e of equipos) qrs.set(e.id, await qrDataUrl(e.qr))

  const cols = 3, rows = 7
  const mX = 8, mTop = 26
  const lw = (210 - mX * 2) / cols // ancho etiqueta
  const lh = (297 - mTop - 8) / rows // alto etiqueta
  const perPage = cols * rows

  equipos.forEach((e, i) => {
    const idx = i % perPage
    if (i > 0 && idx === 0) doc.addPage()
    if (idx === 0) {
      doc.setFillColor(...BRAND); doc.rect(0, 0, 210, 18, 'F')
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
      doc.text('SGEM · Etiquetas de equipamiento', 8, 11)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
      doc.text(clienteNombre, 202, 11, { align: 'right' })
    }
    const col = idx % cols, row = Math.floor(idx / cols)
    const x = mX + col * lw, y = mTop + row * lh
    doc.setDrawColor(224, 231, 233); doc.roundedRect(x + 1, y + 1, lw - 2, lh - 2, 2, 2, 'S')
    const qr = qrs.get(e.id)
    const qs = Math.min(lh - 8, 26)
    if (qr) doc.addImage(qr, 'PNG', x + 4, y + (lh - qs) / 2, qs, qs)
    const tx = x + qs + 7
    const tw = lw - qs - 11
    doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5)
    doc.text(doc.splitTextToSize(e.tipo, tw), tx, y + 8)
    doc.setTextColor(...SOFT); doc.setFont('helvetica', 'normal'); doc.setFontSize(7)
    doc.text(doc.splitTextToSize(`${e.fabricante} ${e.modelo}`, tw), tx, y + 13)
    doc.text(`S/N ${e.serie}`, tx, y + 18)
    doc.setTextColor(...BRAND); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5)
    doc.text(e.qr, tx, y + lh - 6)
  })
  doc.save(`Etiquetas_${clienteNombre.replace(/\s+/g, '_')}.pdf`)
}

export async function certificadoPDF(equipo: Equipo, cliente: Cliente, numero: string, vencISO: string) {
  const doc = new jsPDF()
  header(doc, 'CERTIFICADO', `N° ${numero}`)
  let y = 50
  doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
  doc.text('Certificado de Seguridad Eléctrica', 16, y)
  y += 8
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...SOFT)
  doc.text('Se certifica que el equipo detallado cumple con los ensayos de seguridad eléctrica aplicables.', 16, y)
  y += 16
  kv(doc, 16, y, 'Cliente', cliente.nombre); kv(doc, 110, y, 'Servicio', equipo.ubicacion); y += 16
  kv(doc, 16, y, 'Equipo', `${equipo.tipo} · ${equipo.fabricante} ${equipo.modelo}`); kv(doc, 110, y, 'N° de serie', equipo.serie); y += 16
  kv(doc, 16, y, 'N° de certificado', numero); kv(doc, 110, y, 'Vencimiento', fechaLarga(vencISO)); y += 20

  const qr = await qrDataUrl(equipo.qr)
  doc.addImage(qr, 'PNG', 16, y, 30, 30)
  doc.setTextColor(...SOFT); doc.setFontSize(7.5); doc.text(equipo.qr, 16, y + 34)
  doc.line(120, y + 26, 194, y + 26)
  doc.text('Firma del responsable técnico', 120, y + 31)
  footer(doc)
  doc.save(`Certificado_${numero}.pdf`)
}
