import { Page } from '../components/Layout'
import { EmptyState } from '../components/ui'
import { useStore } from '../lib/store'
import { fecha } from '../lib/format'

export default function Auditoria() {
  const { db } = useStore()
  return (
    <Page title="Auditoría" sub="Registro de acciones de la plataforma">
      <div className="card">
        {db.auditoria.length === 0 ? <EmptyState /> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead>
              <tbody>
                {db.auditoria.map((a) => (
                  <tr key={a.id} style={{ cursor: 'default' }}>
                    <td className="mono small faint">{fecha(a.fechaISO)} {new Date(a.fechaISO).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="mono small">{a.usuario}</td>
                    <td className="row-strong">{a.accion}</td>
                    <td className="muted">{a.detalle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Page>
  )
}
