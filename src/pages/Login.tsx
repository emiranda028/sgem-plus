import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Boxes, ShieldCheck, Smartphone, QrCode, Bell } from 'lucide-react'
import { useStore, ROLE_LABEL } from '../lib/store'
import type { Role } from '../lib/types'

const DEMO: { username: string; rol: Role; desc: string; label?: string }[] = [
  { username: 'emiranda', rol: 'ADMIN', desc: 'Acceso total', label: 'Emmanuel Miranda' },
  { username: 'gestion', rol: 'GESTION', desc: 'Gestión y certificaciones' },
  { username: 'tecnico', rol: 'TECNICO', desc: 'Operación en campo' },
  { username: 'cliente', rol: 'CLIENTE', desc: 'Portal del cliente' },
]

export default function Login() {
  const { user, login } = useStore()
  const nav = useNavigate()
  const [sel, setSel] = useState('admin')
  if (user) return <Navigate to={user.rol === 'CLIENTE' ? '/portal' : '/'} replace />

  const enter = (u: string) => {
    if (login(u)) nav(u === 'cliente' ? '/portal' : '/', { replace: true })
  }

  return (
    <div style={{ minHeight: '100%', display: 'grid', gridTemplateColumns: '1.05fr 1fr' }} className="login-root">
      <div style={{ background: 'linear-gradient(150deg,#0a3f52,#0e7490 50%,#15a6c4)', color: '#eaf6f9', padding: 'clamp(32px,5vw,64px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(255,255,255,.15)', display: 'grid', placeItems: 'center' }}><Boxes size={26} /></span>
          <div>
            <b style={{ fontFamily: 'var(--ff-d)', fontWeight: 800, fontSize: 24, color: '#fff', display: 'block', lineHeight: 1 }}>SGEM Plus</b>
            <small style={{ color: '#a7cfda', letterSpacing: '.14em', textTransform: 'uppercase', fontSize: 11 }}>Biotrust</small>
          </div>
        </div>
        <h1 style={{ color: '#fff', fontSize: 'clamp(1.8rem,3.4vw,2.6rem)', fontWeight: 800, lineHeight: 1.08, maxWidth: '16ch' }}>
          La plataforma premium de equipamiento médico
        </h1>
        <p style={{ color: '#d5ecf2', fontSize: 16, maxWidth: '40ch', margin: 0 }}>
          Inventario, certificaciones, mantenimientos y órdenes de servicio, con portal del cliente, alertas y trabajo en campo.
        </p>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
          {[
            { icon: Bell, t: 'Alertas de vencimiento proactivas' },
            { icon: QrCode, t: 'Etiquetas QR por equipo' },
            { icon: ShieldCheck, t: 'Firma digital y certificados en PDF' },
            { icon: Smartphone, t: 'App instalable y uso sin conexión' },
          ].map(({ icon: Icon, t }) => (
            <li key={t} style={{ display: 'flex', alignItems: 'center', gap: 11, color: '#eaf6f9', fontSize: 14.5 }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.12)', display: 'grid', placeItems: 'center' }}><Icon size={16} /></span>
              {t}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ width: 'min(400px,100%)', display: 'grid', gap: 18 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 750 }}>Entrar a la demo</h2>
            <p className="muted" style={{ marginTop: 4 }}>Elegí un perfil para recorrer la plataforma. Los datos son de demostración y viven en este navegador.</p>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {DEMO.map((d) => (
              <button
                key={d.username}
                onClick={() => setSel(d.username)}
                className="card"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, textAlign: 'left', borderColor: sel === d.username ? 'var(--brand)' : undefined, boxShadow: sel === d.username ? '0 0 0 3px var(--brand-soft)' : undefined }}
              >
                <span style={{ width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--brand-soft)', color: 'var(--brand)', fontWeight: 700, fontFamily: 'var(--ff-d)' }}>
                  {d.username[0].toUpperCase()}
                </span>
                <div style={{ flex: 1 }}>
                  <b style={{ textTransform: 'capitalize' }}>{d.label ?? ROLE_LABEL[d.rol]}</b>
                  <div className="faint small">{d.label ? `${ROLE_LABEL[d.rol]} · ${d.desc}` : d.desc}</div>
                </div>
                <span className="faint small mono">{d.username}</span>
              </button>
            ))}
          </div>
          <button className="btn primary block" style={{ height: 44 }} onClick={() => enter(sel)}>Ingresar</button>
        </div>
      </div>
    </div>
  )
}
