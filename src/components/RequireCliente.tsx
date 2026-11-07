import type { ReactNode } from 'react'
import { Building2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { ClientList } from './ClientPicker'

export default function RequireCliente({ children }: { children: (clienteId: number) => ReactNode }) {
  const { cliente, setCliente } = useStore()
  if (cliente) return <>{children(cliente.id)}</>
  return (
    <div style={{ maxWidth: 520, margin: '20px auto', width: '100%' }}>
      <div className="card pad">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--brand-soft)', color: 'var(--brand)', display: 'grid', placeItems: 'center' }}><Building2 size={20} /></span>
          <div>
            <h3 style={{ fontSize: 16 }}>Elegí un cliente</h3>
            <span className="faint small">Los tableros y la operación se muestran por cliente.</span>
          </div>
        </div>
        <ClientList autoFocus onPick={setCliente} />
      </div>
    </div>
  )
}
