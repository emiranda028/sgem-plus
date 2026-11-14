import { useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Page } from '../components/Layout'
import { EmptyState } from '../components/ui'
import { ROLE_LABEL, useStore } from '../lib/store'

const CATS = [
  { key: 'tipos', label: 'Tipos de equipo' },
  { key: 'fabricantes', label: 'Fabricantes' },
  { key: 'servicios', label: 'Servicios' },
  { key: 'talleres', label: 'Talleres' },
  { key: 'usuarios', label: 'Usuarios y roles' },
] as const

export default function Configuracion() {
  const { db, resetDemo } = useStore()
  const [cat, setCat] = useState<(typeof CATS)[number]['key']>('usuarios')

  const data = useMemo<{ a: string; b: string; c?: string }[]>(() => {
    if (cat === 'tipos') return [...new Set(db.equipos.map((e) => e.tipo))].sort().map((t) => ({ a: t, b: `${db.equipos.filter((e) => e.tipo === t).length} equipos` }))
    if (cat === 'fabricantes') return [...new Set(db.equipos.map((e) => e.fabricante))].sort().map((f) => ({ a: f, b: `${db.equipos.filter((e) => e.fabricante === f).length} equipos` }))
    if (cat === 'servicios') return db.servicios.map((s) => ({ a: s.nombre, b: db.clientes.find((c) => c.id === s.clienteId)?.corto ?? '', c: s.criticidad }))
    if (cat === 'talleres') return db.talleres.map((t) => ({ a: t, b: `${db.ordenes.filter((o) => o.taller === t).length} órdenes` }))
    return db.usuarios.map((u) => ({ a: `${u.nombre} ${u.apellido}`, b: u.email, c: ROLE_LABEL[u.rol] }))
  }, [db, cat])

  const cuenta = {
    tipos: new Set(db.equipos.map((e) => e.tipo)).size, fabricantes: new Set(db.equipos.map((e) => e.fabricante)).size,
    servicios: db.servicios.length, talleres: db.talleres.length, usuarios: db.usuarios.length,
  }

  return (
    <Page title="Configuración" sub="Catálogos, usuarios y datos de demostración"
      actions={<button className="btn secondary" onClick={() => resetDemo()}><RotateCcw size={16} /> Restablecer demo</button>}>
      <div className="cf-tabs">
        {CATS.map((c) => (
          <button key={c.key} className={cat === c.key ? 'on' : ''} onClick={() => setCat(c.key)}
            ref={cat === c.key ? (el) => el?.scrollIntoView({ block: 'nearest', inline: 'center' }) : undefined}>
            {c.label}<b>{String(cuenta[c.key]).padStart(2, '0')}</b>
          </button>
        ))}
      </div>
      {data.length === 0 ? <div className="card"><EmptyState /></div> : (
        <ol className="cf-list">
          {data.map((r, i) => (
            <li key={i}>
              <em>{String(i + 1).padStart(2, '0')}</em>
              <div><b>{r.a}</b><small>{r.b}</small></div>
              {r.c && <span className={`badge ${r.c === 'ALTA' ? 'tone-danger' : r.c === 'MEDIA' ? 'tone-warn' : ''}`}>{r.c}</span>}
            </li>
          ))}
        </ol>
      )}
      <p className="tn-foot">Esta es una demostración con datos ficticios que viven en tu navegador. Al conectar el backend real, estos catálogos se vuelven editables y se sincronizan.</p>
    </Page>
  )
}
