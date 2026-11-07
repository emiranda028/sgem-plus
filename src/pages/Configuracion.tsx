import { useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Page } from '../components/Layout'
import { Badge, EmptyState } from '../components/ui'
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

  return (
    <Page title="Configuración" sub="Catálogos, usuarios y datos de demostración"
      actions={<button className="btn secondary" onClick={() => resetDemo()}><RotateCcw size={16} /> Restablecer demo</button>}>
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }} className="cfg-grid">
        <div className="card pad" style={{ display: 'grid', gap: 2 }}>
          {CATS.map((c) => (
            <button key={c.key} className="nav-item" onClick={() => setCat(c.key)}
              style={{ textAlign: 'left', padding: '9px 12px', borderRadius: 9, fontWeight: 600, fontSize: 13.5, background: cat === c.key ? 'var(--brand-soft)' : 'transparent', color: cat === c.key ? 'var(--brand)' : 'var(--text-2)' }}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="card">
          <div className="card-head"><h3>{CATS.find((c) => c.key === cat)?.label}</h3><span className="faint small">{data.length} registros</span></div>
          {data.length === 0 ? <EmptyState /> : (
            <div className="tbl-wrap">
              <table className="tbl">
                <tbody>
                  {data.map((r, i) => (
                    <tr key={i} style={{ cursor: 'default' }}>
                      <td className="row-strong">{r.a}</td>
                      <td className="muted">{r.b}</td>
                      {r.c && <td style={{ textAlign: 'right' }}><Badge tone={r.c === 'ALTA' ? 'danger' : r.c === 'MEDIA' ? 'warn' : 'brand'}>{r.c}</Badge></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <p className="faint small">Esta es una demostración con datos ficticios que viven en tu navegador. Al conectar el backend real, estos catálogos se vuelven editables y se sincronizan.</p>
    </Page>
  )
}
