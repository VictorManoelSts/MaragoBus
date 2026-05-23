import { Outlet, useNavigate } from 'react-router-dom'
import { useSuspensaoModal } from '@/hooks/useSuspensaoModal'
import { useNotificacoes } from '@/hooks/useNotificacoes'
import { SuspensaoModal } from '@/components/SuspensaoModal'
import { NotificationBell } from '@/components/NotificationBell'

export function AlunoLayout() {
  const { mostrar, advertencias, dataReativacao, fechar } = useSuspensaoModal()
  const { naoLidas } = useNotificacoes()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {mostrar && (
        <SuspensaoModal
          advertencias={advertencias}
          dataReativacao={dataReativacao}
          onFechar={fechar}
        />
      )}

      <header className="bg-surface border-b border-thin border-border
                         flex items-center justify-between px-xxxl py-lg">
        <img
          src="/logo-maragogi.png"
          alt="Prefeitura de Maragogi"
          className="w-logo-sm h-logo-sm object-contain"
        />
        <NotificationBell
          naoLidas={naoLidas}
          onClick={() => navigate('/aluno/notificacoes')}
        />
      </header>

      <main className="flex-1 w-full max-w-content mx-auto px-xxxl py-lg pb-nav-bar">
        <Outlet />
      </main>
    </div>
  )
}
