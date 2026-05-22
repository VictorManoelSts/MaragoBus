import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '@/pages/auth/LoginPage'
import { FirstAccessPage } from '@/pages/auth/FirstAccessPage'
import { ProtectedRoute, PrimeiroAcessoRoute, RootRedirect } from '@/components/ProtectedRoute'
import { AlunoLayout } from '@/layouts/AlunoLayout'
import { MotoristaLayout } from '@/layouts/MotoristaLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { ReservaPage } from '@/pages/aluno/ReservaPage'
import { ComprovantePage } from '@/pages/aluno/ComprovantePage'
import { NotificacoesPage } from '@/pages/aluno/NotificacoesPage'
import { ListaAlunosPage } from '@/pages/motorista/ListaAlunosPage'
import { DetalheAlunoPage as MotoristaDetalheAlunoPage } from '@/pages/motorista/DetalheAlunoPage'
import { ReservasPage } from '@/pages/admin/ReservasPage'
import { AlunosPage } from '@/pages/admin/AlunosPage'
import { DetalheAlunoPage as AdminDetalheAlunoPage } from '@/pages/admin/DetalheAlunoPage'
import { EdicaoAlunoPage } from '@/pages/admin/EdicaoAlunoPage'
import { CadastroAlunoPage } from '@/pages/admin/CadastroAlunoPage'
import { SolicitacoesPage } from '@/pages/admin/SolicitacoesPage'
import { FeriadosPage } from '@/pages/admin/FeriadosPage'
import { PontosPage } from '@/pages/admin/PontosPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <PrimeiroAcessoRoute />,
    children: [
      {
        path: '/primeiro-acesso',
        element: <FirstAccessPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute perfil="aluno" />,
    children: [
      {
        element: <AlunoLayout />,
        children: [
          { path: '/aluno', element: <Navigate to="/aluno/reserva" replace /> },
          { path: '/aluno/reserva', element: <ReservaPage /> },
          { path: '/aluno/comprovante', element: <ComprovantePage /> },
          { path: '/aluno/notificacoes', element: <NotificacoesPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute perfil="motorista" />,
    children: [
      {
        element: <MotoristaLayout />,
        children: [
          { path: '/motorista', element: <Navigate to="/motorista/alunos" replace /> },
          { path: '/motorista/alunos', element: <ListaAlunosPage /> },
          { path: '/motorista/alunos/:id', element: <MotoristaDetalheAlunoPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute perfil="admin" />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/admin', element: <Navigate to="/admin/reservas" replace /> },
          { path: '/admin/reservas', element: <ReservasPage /> },
          { path: '/admin/alunos', element: <AlunosPage /> },
          { path: '/admin/alunos/:id', element: <AdminDetalheAlunoPage /> },
          { path: '/admin/alunos/:id/editar', element: <EdicaoAlunoPage /> },
          { path: '/admin/cadastrar', element: <CadastroAlunoPage /> },
          { path: '/admin/solicitacoes', element: <SolicitacoesPage /> },
          { path: '/admin/feriados', element: <FeriadosPage /> },
          { path: '/admin/pontos', element: <PontosPage /> },
        ],
      },
    ],
  },
])
