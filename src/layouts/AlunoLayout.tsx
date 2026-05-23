import { Outlet } from 'react-router-dom'
import { useSuspensaoModal } from '@/hooks/useSuspensaoModal'
import { SuspensaoModal } from '@/components/SuspensaoModal'

export function AlunoLayout() {
  const { mostrar, advertencias, dataReativacao, fechar } = useSuspensaoModal()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {mostrar && (
        <SuspensaoModal
          advertencias={advertencias}
          dataReativacao={dataReativacao}
          onFechar={fechar}
        />
      )}
      <main className="flex-1 w-full max-w-content mx-auto px-xxxl py-lg pb-nav-bar">
        <Outlet />
      </main>
    </div>
  )
}
