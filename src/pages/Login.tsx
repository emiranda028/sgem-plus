import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Boxes } from 'lucide-react'
import { HeroTraces } from '../components/Vitals'
import { useStore, ROLE_LABEL } from '../lib/store'
import { useCountUp } from '../lib/motion'
import type { Role } from '../lib/types'

const DEMO: { username: string; rol: Role; desc: string; label?: string }[] = [
  { username: 'emiranda', rol: 'ADMIN', desc: 'Acceso total', label: 'Emmanuel Miranda' },
  { username: 'gestion', rol: 'GESTION', desc: 'Gestión y certificaciones' },
  { username: 'tecnico', rol: 'TECNICO', desc: 'Operación en campo' },
  { username: 'cliente', rol: 'CLIENTE', desc: 'Portal del cliente' },
]

const PUNTOS = [
  'Aviso antes de cada vencimiento',
  'Etiquetas QR por equipo',
  'Firma digital y certificados en PDF',
  'Se instala en el celular del técnico',
]

function Lectura({ n, label }: { n: number; label: string }) {
  return <div className="lg-read"><b>{useCountUp(n, 1100)}</b><span>{label}</span></div>
}

export default function Login() {
  const { user, login, db } = useStore()
  const instituciones = db.clientes.length
  const equipos = db.equipos.filter((e) => e.estado !== 'BAJA').length
  const nav = useNavigate()
  const [sel, setSel] = useState('emiranda')
  if (user) return <Navigate to={user.rol === 'CLIENTE' ? '/portal' : '/'} replace />

  const enter = (u: string) => {
    if (login(u)) nav(u === 'cliente' ? '/portal' : '/', { replace: true })
  }

  return (
    <div className="login-root lg-root">
      <div className="lg-hero stagger">
        <HeroTraces />
        <div className="lg-brand">
          <span className="mk"><Boxes size={24} /></span>
          <div><b>SGEM Plus</b><small>Biotrust</small></div>
        </div>
        <h1>Gestión de equipamiento médico para clínicas y sanatorios</h1>
        <p>Inventario, certificaciones, mantenimientos y órdenes de servicio en un solo lugar, con portal para cada institución.</p>
        <div>
          <div className="lg-kicker">Datos de la demo</div>
          <div className="lg-strip">
            <Lectura n={equipos} label="Equipos" />
            <Lectura n={instituciones} label="Instituciones" />
          </div>
        </div>
        <ul className="lg-list">
          {PUNTOS.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>

      <div className="lg-side">
        <div className="lg-box">
          <div>
            <div className="lg-kicker ink">Acceso</div>
            <h2>Entrar a la demo</h2>
            <p className="muted" style={{ marginTop: 12 }}>Elegí un perfil para recorrer la plataforma. Los datos son de demostración y viven en este navegador.</p>
          </div>
          <div className="lg-rows stagger" role="radiogroup" aria-label="Perfil">
            {DEMO.map((d) => (
              <button key={d.username} role="radio" aria-checked={sel === d.username} onClick={() => setSel(d.username)} onDoubleClick={() => enter(d.username)} className={`lg-row ${sel === d.username ? 'on' : ''}`}>
                <span className="led" />
                <span>
                  <b>{d.label ?? ROLE_LABEL[d.rol]}</b>
                  <span className="rol">{d.label ? `${ROLE_LABEL[d.rol]} · ${d.desc}` : d.desc}</span>
                </span>
                <span className="usr">{d.username}</span>
              </button>
            ))}
          </div>
          <button className="btn primary block" style={{ height: 48 }} onClick={() => enter(sel)}>Ingresar</button>
        </div>
      </div>
    </div>
  )
}
