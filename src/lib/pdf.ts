import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import type { CertificadoEmitido, Cliente, Equipo, OrdenServicio, Protocolo } from './types'
import { clean, fecha, fechaLarga } from './format'

/* Documentos con el lenguaje "placa y planilla" de la app: sin franjas de
   color, filetes de tinta, etiquetas en mono (Courier), titulares en
   condensada (Barlow Condensed) y placa de identificación del equipo. */

type RGB = [number, number, number]
const INK: RGB = [11, 11, 13]
const SOFT: RGB = [112, 114, 126]
const LINE: RGB = [206, 208, 214]
const BRAND: RGB = [27, 57, 196]
const OK: RGB = [21, 128, 61]
const WARN: RGB = [194, 65, 12]
const DANGER: RGB = [207, 29, 29]
const L = 16, R = 194, W = R - L

/* ---- Fuente condensada (se baja una vez; si falla, cae a Helvetica) ---- */
let condB64: string | null | undefined
const conCond = new WeakSet<jsPDF>()
async function loadCond(): Promise<string | null> {
  if (condB64 !== undefined) return condB64
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}fonts/BarlowCondensed-Bold.ttf`)
    if (!r.ok) throw new Error('fuente')
    const buf = new Uint8Array(await r.arrayBuffer())
    let bin = ''
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
    condB64 = btoa(bin)
  } catch { condB64 = null }
  return condB64
}
async function nuevoDoc() {
  const doc = new jsPDF()
  const b = await loadCond()
  if (b) {
    doc.addFileToVFS('BarlowCondensed-Bold.ttf', b)
    doc.addFont('BarlowCondensed-Bold.ttf', 'BarlowCond', 'bold')
    conCond.add(doc)
  }
  return doc
}

/* ---- Primitivas ---- */
function titular(doc: jsPDF, size: number, color: RGB = INK) {
  if (conCond.has(doc)) { doc.setFont('BarlowCond', 'bold'); doc.setFontSize(size) }
  else { doc.setFont('helvetica', 'bold'); doc.setFontSize(size * 0.74) }
  doc.setTextColor(...color)
}
function mono(doc: jsPDF, size: number, color: RGB = SOFT, bold = false) {
  doc.setFont('courier', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(...color)
}
function texto(doc: jsPDF, size: number, color: RGB = INK, bold = false) {
  doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(...color)
}
function filete(doc: jsPDF, y: number, grosor = 0.2, color: RGB = LINE, x1 = L, x2 = R) {
  doc.setDrawColor(...color); doc.setLineWidth(grosor); doc.line(x1, y, x2, y)
}
function etiqueta(doc: jsPDF, x: number, y: number, t: string, color: RGB = SOFT) {
  mono(doc, 6.5, color); doc.text(t.toUpperCase(), x, y, { charSpace: 0.25 })
}
/** La fuente estándar de jsPDF (WinAnsi) no tiene ≤, Ω, ±, subíndices: los pasamos a ASCII. */
function ascii(s: string) {
  return s
    .replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/±/g, '+/-')
    .replace(/\s*Ω/g, ' ohm').replace(/µ/g, 'u').replace(/°/g, 'deg')
    .replace(/₂/g, '2').replace(/₃/g, '3').replace(/²/g, '2').replace(/³/g, '3')
}

function header(doc: jsPDF, titulo: string, codigo: string) {
  titular(doc, 27); doc.text('SGEM', L, 20)
  mono(doc, 6.5, SOFT); doc.text('PLUS · BIOTRUST', L, 24.6, { charSpace: 0.5 })
  titular(doc, 21); doc.text(titulo.toUpperCase(), R, 18.5, { align: 'right' })
  mono(doc, 8, INK, true); doc.text(codigo, R, 24.6, { align: 'right' })
  filete(doc, 28.5, 0.7, INK)
}
function footer(doc: jsPDF) {
  filete(doc, 281, 0.3, INK)
  mono(doc, 6.5, SOFT)
  doc.text('SGEM PLUS · DOCUMENTO GENERADO POR EL SISTEMA', L, 285.5, { charSpace: 0.2 })
  doc.text(fechaLarga(new Date().toISOString()).toUpperCase(), R, 285.5, { align: 'right' })
}
/** Campo de planilla: etiqueta en mono, valor y filete inferior. Alto 13. */
function campo(doc: jsPDF, x: number, y: number, w: number, k: string, v: string) {
  etiqueta(doc, x, y, k)
  texto(doc, 10, INK, true)
  doc.text(String(doc.splitTextToSize(v || '—', w)[0]), x, y + 5.6)
  filete(doc, y + 8, 0.2, LINE, x, x + w)
}
function fila2(doc: jsPDF, y: number, a: [string, string], b: [string, string]) {
  const w = (W - 10) / 2
  campo(doc, L, y, w, a[0], a[1]); campo(doc, L + w + 10, y, w, b[0], b[1])
  return y + 13.5
}
function seccion(doc: jsPDF, y: number, t: string) {
  filete(doc, y, 0.35, INK)
  etiqueta(doc, L, y + 4.6, t, INK)
  return y + 10
}
function led(doc: jsPDF, x: number, y: number, color: RGB, t: string) {
  doc.setFillColor(...color); doc.rect(x, y - 2.05, 2.1, 2.1, 'F')
  mono(doc, 7.5, color, true); doc.text(t.toUpperCase(), x + 3.6, y, { charSpace: 0.2 })
}
/** Sello de resultado: doble marco y texto condensado. */
function sello(doc: jsPDF, x: number, y: number, t: string, color: RGB, w = 46) {
  doc.setDrawColor(...color); doc.setLineWidth(0.7); doc.rect(x, y, w, 15)
  doc.setLineWidth(0.2); doc.rect(x + 1.1, y + 1.1, w - 2.2, 12.8)
  titular(doc, 19, color); doc.text(t.toUpperCase(), x + w / 2, y + 10.6, { align: 'center' })
}
async function qrDataUrl(text: string) {
  return QRCode.toDataURL(text, { width: 240, margin: 0, color: { dark: '#0b0b0d', light: '#ffffff' } })
}
/** Placa de identificación del equipo. Alto 27. */
async function placa(doc: jsPDF, y: number, e: Equipo, banda: RGB = BRAND) {
  const h = 27
  doc.setDrawColor(...INK); doc.setLineWidth(0.5); doc.rect(L, y, W, h)
  doc.setFillColor(...banda); doc.rect(L, y, 2.6, h, 'F')
  doc.setFillColor(...SOFT); doc.circle(R - 2.6, y + 2.6, 0.55, 'F'); doc.circle(R - 2.6, y + h - 2.6, 0.55, 'F')
  etiqueta(doc, L + 8, y + 6.6, e.qr)
  titular(doc, 22)
  doc.text(String(doc.splitTextToSize(e.tipo.toUpperCase(), W - 44)[0]), L + 8, y + 15.8)
  mono(doc, 7.5, SOFT)
  doc.text(`${e.fabricante} ${e.modelo} · S/N ${e.serie}`.toUpperCase(), L + 8, y + 21.8, { charSpace: 0.15 })
  doc.addImage(await qrDataUrl(e.qr), 'PNG', R - 27, y + 3.5, 20, 20)
  return y + h + 9
}
function firma(doc: jsPDF, y: number, leyenda: string, quien?: string, img?: string) {
  if (img && img.startsWith('data:')) { try { doc.addImage(img, 'PNG', 126, y - 25, 58, 23) } catch { /* ignore */ } }
  filete(doc, y, 0.35, INK, 116, R)
  etiqueta(doc, 116, y + 4.4, leyenda)
  if (quien) { texto(doc, 9, INK, true); doc.text(String(doc.splitTextToSize(quien, R - 116)[0]), 116, y + 9.4) }
}
const colorSitu = (s: string): RGB => (s === 'Cerrada' || s === 'Lista' ? OK : s === 'Esperando repuesto' ? DANGER : s === 'Presupuestar' ? BRAND : WARN)

/* ---- Remito ---- */
export async function remitoPDF(o: OrdenServicio, equipo: Equipo | null, cliente: Cliente) {
  const doc = await nuevoDoc()
  header(doc, 'Remito de servicio', o.numero)
  let y = 37
  if (equipo) y = await placa(doc, y, equipo, colorSitu(o.situacion))
  texto(doc, 12.5, INK, true); doc.text(String(doc.splitTextToSize(clean(o.titulo), W)[0]), L, y); y += 9
  y = fila2(doc, y, ['Cliente', cliente.nombre], ['Apertura', fechaLarga(o.aperturaISO)])
  y = fila2(doc, y, ['Tipo de orden', o.tipo], ['Taller', o.taller])
  y = fila2(doc, y, ['Técnico', o.tecnico], ['Criticidad', o.criticidad])
  y += 3

  y = seccion(doc, y, 'Descripción y trabajos realizados')
  if (o.descripcion) {
    texto(doc, 10)
    const d = doc.splitTextToSize(clean(o.descripcion), W).slice(0, 4)
    doc.text(d, L, y); y += d.length * 4.8 + 4
  }
  for (const a of o.acciones) {
    if (y > 222) { mono(doc, 7); doc.text('(continúa en el sistema)', L, y); break }
    const lineas = doc.splitTextToSize(a.nota, W - 34).slice(0, 2)
    mono(doc, 7, SOFT); doc.text(fecha(a.fechaISO), L, y)
    texto(doc, 9.5); doc.text(lineas, L + 26, y)
    if (a.tipo === 'tarea') {
      const c: RGB = a.estado === 'hecha' ? OK : a.estado === 'en_curso' ? WARN : SOFT
      doc.setFillColor(...c); doc.rect(L + 21.5, y - 2.1, 2.1, 2.1, 'F')
    }
    y += lineas.length * 4.4 + 1.6
    filete(doc, y - 0.6, 0.15); y += 3.4
  }

  const yr = Math.max(y + 22, 150)
  etiqueta(doc, L, yr - 3, 'Estado de la orden')
  sello(doc, L, yr, o.situacion === 'Cerrada' ? 'Entregado' : o.situacion, colorSitu(o.situacion), 62)
  firma(doc, yr + 15, 'Recibí conforme', o.firmante || 'Recepción del cliente', o.firmaDataUrl)
  footer(doc)

  const fotos = (o.fotosData ?? []).filter((f) => f.startsWith('data:'))
  if (fotos.length) {
    doc.addPage()
    header(doc, 'Anexo fotográfico', o.numero)
    seccion(doc, 37, 'Registro fotográfico del servicio')
    const cols = 2, w = 86, h = 64, gapX = 6, gapY = 8, x0 = L, y0 = 50
    fotos.slice(0, 6).forEach((src, i) => {
      const x = x0 + (i % cols) * (w + gapX), yy = y0 + Math.floor(i / cols) * (h + gapY)
      try {
        doc.addImage(src, 'JPEG', x, yy, w, h)
        doc.setDrawColor(...INK); doc.setLineWidth(0.3); doc.rect(x, yy, w, h)
      } catch { /* ignore */ }
    })
    footer(doc)
  }
  doc.save(`Remito_${o.numero}.pdf`)
}

/* ---- Informe de ensayo ---- */
export async function informeEnsayoPDF(o: OrdenServicio, equipo: Equipo | null, cliente: Cliente, pr: Protocolo) {
  const doc = await nuevoDoc()
  header(doc, 'Informe de ensayo', o.numero)
  let y = 37
  if (equipo) y = await placa(doc, y, equipo)
  texto(doc, 12.5, INK, true); doc.text(pr.tipo, L, y); y += 5
  mono(doc, 7.5); doc.text(ascii(pr.norma).toUpperCase(), L, y, { charSpace: 0.15 }); y += 9
  y = fila2(doc, y, ['Cliente', cliente.nombre], ['Fecha del ensayo', fechaLarga(pr.fechaISO)])
  y = fila2(doc, y, ['Realizado por', pr.realizadoPor], ['Orden de servicio', o.numero])
  y += 3

  y = seccion(doc, y, 'Mediciones')
  const cL = L + 96, cM = L + 128, cR = L + 154
  etiqueta(doc, L, y, 'Ensayo'); etiqueta(doc, cL, y, 'Límite'); etiqueta(doc, cM, y, 'Medido'); etiqueta(doc, cR, y, 'Resultado')
  y += 2.5; filete(doc, y, 0.35, INK); y += 5.5
  for (const it of pr.items) {
    const lab = doc.splitTextToSize(ascii(it.label), 90).slice(0, 2)
    texto(doc, 9); doc.text(lab, L, y)
    mono(doc, 8, SOFT); doc.text(ascii(it.limite), cL, y)
    mono(doc, 8.5, INK, true); doc.text(ascii(it.valor || '—'), cM, y)
    led(doc, cR, y, it.ok === true ? OK : it.ok === false ? DANGER : SOFT, it.ok === true ? 'Apto' : it.ok === false ? 'No apto' : 'N/A')
    y += lab.length * 4.2 + 1.4
    filete(doc, y - 0.4, 0.15); y += 4
  }
  const rc = pr.resultado === 'APTO' ? OK : pr.resultado === 'NO APTO' ? DANGER : WARN
  const yb = y + 20
  etiqueta(doc, L, yb - 3, 'Resultado del ensayo')
  sello(doc, L, yb, pr.resultado, rc, pr.resultado === 'APTO' ? 46 : 62)
  firma(doc, yb + 15, 'Firma del responsable técnico', pr.realizadoPor)
  footer(doc)
  doc.save(`Informe_ensayo_${o.numero}.pdf`)
}

/* ---- Certificado ---- */
export async function certificadoPDF(equipo: Equipo, cliente: Cliente, numero: string, vencISO: string, cert?: Partial<CertificadoEmitido>) {
  const doc = await nuevoDoc()
  header(doc, 'Certificado', `N° ${numero}`)
  let y = 42
  etiqueta(doc, L, y, 'Certificado de'); y += 11
  titular(doc, 38); doc.text('SEGURIDAD ELÉCTRICA', L, y); y += 8
  texto(doc, 10, SOFT)
  const p = doc.splitTextToSize('Se certifica que el equipo detallado cumple con los ensayos de seguridad eléctrica aplicables.', W)
  doc.text(p, L, y); y += p.length * 4.8 + 6

  y = await placa(doc, y, equipo, OK)
  y = fila2(doc, y, ['Cliente', cliente.nombre], ['Ubicación', equipo.ubicacion])
  y = fila2(doc, y, ['N° de certificado', numero], ['Norma', ascii((cert?.norma ?? 'IEC 62353').split('·')[0].trim())])
  y = fila2(doc, y, ['Emitido', cert?.fechaISO ? fechaLarga(cert.fechaISO) : '—'], ['Criticidad del equipo', equipo.criticidad])
  y += 6

  filete(doc, y, 0.7, INK); y += 7
  etiqueta(doc, L, y, 'Vigente hasta'); y += 15
  titular(doc, 44); doc.text(fecha(vencISO), L, y)
  sello(doc, R - 46, y - 15.5, 'Apto', OK)
  y += 6; filete(doc, y, 0.2)

  firma(doc, y + 42, 'Firma del responsable técnico', cert?.firmante, cert?.firmaDataUrl)
  footer(doc)
  doc.save(`Certificado_${numero}.pdf`)
}

/* ---- Informe de gestión ---- */
export interface ReporteData {
  periodo: string
  equipos: number
  certVig: number
  mpVig: number
  abiertas: number
  cerradasMes: number
  mttr: number
  sla: number
  porTipo: { name: string; value: number }[]
  topEquipos: { name: string; value: number }[]
}

export async function reporteGerencialPDF(cliente: Cliente, r: ReporteData) {
  const doc = await nuevoDoc()
  header(doc, 'Informe de gestión', r.periodo.toUpperCase())
  let y = 42
  etiqueta(doc, L, y, 'Resumen de gestión del equipamiento'); y += 11
  titular(doc, 30); doc.text(String(doc.splitTextToSize(cliente.nombre.toUpperCase(), W)[0]), L, y); y += 8

  const lecturas: [string, string, string][] = [
    ['Equipos activos', String(r.equipos), ''],
    ['Certificación vigente', String(r.certVig), '%'],
    ['Preventivo vigente', String(r.mpVig), '%'],
    ['Órdenes abiertas', String(r.abiertas), ''],
    ['Cerradas en el período', String(r.cerradasMes), ''],
    ['Tiempo de reparación', String(r.mttr), 'DÍAS'],
    ['Cumplimiento de SLA', String(r.sla), '%'],
  ]
  const cw = W / 4, ch = 24
  filete(doc, y, 0.7, INK)
  lecturas.forEach((t, i) => {
    const col = i % 4, row = Math.floor(i / 4)
    const x = L + col * cw, ty = y + row * ch
    if (col > 0) { doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.line(x, ty + 2, x, ty + ch - 2) }
    etiqueta(doc, x + (col ? 4 : 0), ty + 6, t[0])
    titular(doc, 32); const vx = x + (col ? 4 : 0); doc.text(t[1], vx, ty + 19)
    if (t[2]) { const wv = doc.getTextWidth(t[1]); mono(doc, 7.5, SOFT, true); doc.text(t[2], vx + wv + 1.6, ty + 19) }
    if (col === 3 || i === lecturas.length - 1) filete(doc, ty + ch, 0.2)
  })
  y += Math.ceil(lecturas.length / 4) * ch + 10

  const bloque = (title: string, rows: { name: string; value: number }[], yy: number) => {
    yy = seccion(doc, yy, title)
    const max = Math.max(1, ...rows.map((x) => x.value))
    for (const x of rows.slice(0, 8)) {
      texto(doc, 9.5); doc.text(String(doc.splitTextToSize(x.name, 74)[0]), L, yy + 3.2)
      doc.setFillColor(...LINE); doc.rect(L + 80, yy + 1, 82, 1.6, 'F')
      doc.setFillColor(...INK); doc.rect(L + 80, yy + 1, (82 * x.value) / max, 1.6, 'F')
      titular(doc, 13); doc.text(String(x.value), R, yy + 3.6, { align: 'right' })
      yy += 7.2
    }
    return yy + 6
  }
  y = bloque('Órdenes por tipo', r.porTipo, y)
  bloque('Equipos con más órdenes', r.topEquipos, y)
  footer(doc)
  doc.save(`Informe_gestion_${cliente.corto}.pdf`)
}

/* ---- Etiquetas QR ---- */
export async function etiquetasPDF(equipos: Equipo[], clienteNombre: string) {
  const doc = await nuevoDoc()
  const qrs = new Map<number, string>()
  for (const e of equipos) qrs.set(e.id, await qrDataUrl(e.qr))

  const cols = 3, rows = 7
  const mX = 8, mTop = 24
  const lw = (210 - mX * 2) / cols
  const lh = (297 - mTop - 8) / rows
  const perPage = cols * rows

  equipos.forEach((e, i) => {
    const idx = i % perPage
    if (i > 0 && idx === 0) doc.addPage()
    if (idx === 0) {
      titular(doc, 17); doc.text('SGEM', mX, 13)
      mono(doc, 6.5, SOFT); doc.text('ETIQUETAS DE EQUIPAMIENTO', mX + 17, 13, { charSpace: 0.3 })
      mono(doc, 7.5, INK, true); doc.text(clienteNombre.toUpperCase(), 210 - mX, 13, { align: 'right' })
      filete(doc, 17, 0.6, INK, mX, 210 - mX)
    }
    const col = idx % cols, row = Math.floor(idx / cols)
    const x = mX + col * lw, y = mTop + row * lh
    doc.setDrawColor(...INK); doc.setLineWidth(0.3); doc.rect(x + 1, y + 1, lw - 2, lh - 2)
    doc.setFillColor(...INK); doc.rect(x + 1, y + 1, 1.6, lh - 2, 'F')
    const qr = qrs.get(e.id)
    const qs = Math.min(lh - 10, 24)
    if (qr) doc.addImage(qr, 'PNG', x + 5.5, y + (lh - qs) / 2, qs, qs)
    const tx = x + qs + 8.5
    const tw = lw - qs - 12
    // Achica el cuerpo hasta que la palabra más larga entre sin cortarse.
    let cuerpo = 11.5
    const palabras = e.tipo.toUpperCase().split(/\s+/)
    titular(doc, cuerpo)
    while (cuerpo > 7.5 && Math.max(...palabras.map((w) => doc.getTextWidth(w))) > tw) { cuerpo -= 0.5; titular(doc, cuerpo) }
    const tipo = doc.splitTextToSize(e.tipo.toUpperCase(), tw).slice(0, 2)
    doc.text(tipo, tx, y + 8.5)
    const y2 = y + 8.5 + tipo.length * 4.2
    mono(doc, 5.8, SOFT)
    doc.text(String(doc.splitTextToSize(`${e.fabricante} ${e.modelo}`.toUpperCase(), tw)[0]), tx, y2)
    doc.text(`S/N ${e.serie}`, tx, y2 + 3.4)
    mono(doc, 7.5, INK, true)
    doc.text(e.qr, tx, y + lh - 5.5)
  })
  doc.save(`Etiquetas_${clienteNombre.replace(/\s+/g, '_')}.pdf`)
}
