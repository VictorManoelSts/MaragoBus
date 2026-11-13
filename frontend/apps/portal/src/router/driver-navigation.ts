import { CalendarDays, ClipboardList, UserRound } from '@lucide/vue'
import type { PortalNavigationItem } from '../types/navigation'

export const driverNavigationItems: readonly PortalNavigationItem[] = [
  {
    name: 'driver-reservations', path: '/motorista/reservas', label: 'Reservas',
    title: 'Reservas', icon: CalendarDays,
    description: 'Consulte futuramente a quantidade de alunos com reservas confirmadas, a demanda por faculdade e ponto de embarque, a listagem e pesquisa de alunos e os detalhes dos passageiros.',
  },
  {
    name: 'driver-warning-requests', path: '/motorista/advertencias', label: 'Solicitações de advertência',
    title: 'Solicitações de advertência', icon: ClipboardList,
    description: 'Espaço para solicitar futuramente advertências para alunos com motivo e consultar suas próprias solicitações nos estados Pendente, Aprovada e Recusada.',
  },
  {
    name: 'driver-profile', path: '/motorista/perfil', label: 'Meu perfil',
    title: 'Perfil do motorista', icon: UserRound,
    description: 'Espaço para consultar as informações do perfil do motorista.',
  },
]
