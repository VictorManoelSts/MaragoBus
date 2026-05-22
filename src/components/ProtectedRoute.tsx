import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { Perfil } from '@/services/authService'

export const ROTA_PADRAO: Record<Perfil, string> = {
  aluno: '/aluno/reserva',
  motorista: '/motorista/alunos',
  admin: '/admin/reservas',
}

function Spinner() {
  return (
    <div className="bg-background min-h-screen flex items-center justify-center">
      <div
        data-testid="spinner"
        className="w-spinner h-spinner rounded-full border-[3px] border-primary/30 border-t-primary spinner-animation"
      />
    </div>
  )
}

interface ProtectedRouteProps {
  perfil: Perfil
}

export function ProtectedRoute({ perfil }: ProtectedRouteProps) {
  const auth = useAuth()

  if (auth.loading) return <Spinner />
  if (!auth.uid) return <Navigate to="/login" replace />
  if (auth.primeiroAcesso) return <Navigate to="/primeiro-acesso" replace />
  if (auth.perfil !== perfil) {
    return <Navigate to={auth.perfil ? ROTA_PADRAO[auth.perfil] : '/login'} replace />
  }

  return <Outlet />
}

export function PrimeiroAcessoRoute() {
  const auth = useAuth()

  if (auth.loading) return <Spinner />
  if (!auth.uid) return <Navigate to="/login" replace />
  if (!auth.primeiroAcesso) {
    return <Navigate to={auth.perfil ? ROTA_PADRAO[auth.perfil] : '/login'} replace />
  }

  return <Outlet />
}

export function RootRedirect() {
  const auth = useAuth()

  if (auth.loading) return <Spinner />
  if (!auth.uid) return <Navigate to="/login" replace />
  if (auth.primeiroAcesso) return <Navigate to="/primeiro-acesso" replace />

  return <Navigate to={auth.perfil ? ROTA_PADRAO[auth.perfil] : '/login'} replace />
}
