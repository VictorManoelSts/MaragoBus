import { Building2, CalendarDays, ClipboardList, House, UserRound } from '@lucide/vue'
import type { PortalNavigationItem } from '../types/navigation'

export const driverFeatures = [
  {
    name: 'driver-reservations', path: '/motorista/reservas', label: 'Reservas',
    title: 'Reservas', icon: CalendarDays,
    action: 'Consultar reservas dos alunos',
    linkLabel: 'Consultar reservas',
    availability: 'Consulte as reservas confirmadas por data e filtre por aluno, faculdade ou ponto de embarque.',
    description: 'Reservas confirmadas dos alunos.',
  },
  {
    name: 'driver-warning-requests', path: '/motorista/advertencias', label: 'Solicitações de advertência',
    title: 'Solicitações de advertência', icon: ClipboardList,
    action: 'Solicitar advertências',
    linkLabel: 'Consultar solicitações',
    availability: 'Envie solicitações pelas reservas confirmadas e acompanhe a situação nesta página.',
    description: 'Acompanhe suas solicitações de advertência.',
  },
  {
    name: 'driver-college-distribution', path: '/motorista/faculdades', label: 'Faculdades',
    title: 'Distribuição de faculdades', icon: Building2,
    action: 'Consultar distribuição de faculdades',
    linkLabel: null,
    availability: 'A consulta da distribuição por faculdade ainda está em desenvolvimento.',
    description: 'Espaço para consultar futuramente a distribuição de faculdades atendidas pelo transporte.',
  },
] as const

export const driverProfile = {
  name: 'driver-profile', path: '/motorista/perfil', label: 'Meu perfil',
  title: 'Perfil do motorista', icon: UserRound,
  description: 'Espaço para consultar as informações do perfil do motorista.',
} as const

export const driverNavigationItems: readonly PortalNavigationItem[] = [
  {
    name: 'driver-home', path: '/motorista', label: 'Início',
    title: 'Painel do motorista', icon: House, description: 'Página inicial do motorista.',
  },
  driverFeatures[0],
  driverFeatures[1],
  driverProfile,
]
