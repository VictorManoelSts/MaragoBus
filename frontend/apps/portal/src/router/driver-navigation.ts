import { CalendarDays, ClipboardList, UserRound } from '@lucide/vue'
import type { PortalNavigationItem } from '../types/navigation'

export const driverNavigationItems = [
  {
    name: 'driver-reservations', path: '/motorista/reservas', label: 'Reservas',
    title: 'Reservas', icon: CalendarDays,
    description: 'Consulte as reservas confirmadas por data e faculdade.',
  },
  {
    name: 'driver-warning-requests', path: '/motorista/advertencias', label: 'Advertências',
    title: 'Solicitações de advertência', icon: ClipboardList,
    description: 'Acompanhe suas solicitações de advertência.',
  },
  {
    name: 'driver-profile', path: '/motorista/perfil', label: 'Meu perfil',
    title: 'Perfil do motorista', icon: UserRound,
    description: 'Espaço para consultar as informações do perfil do motorista.',
  },
] as const satisfies readonly PortalNavigationItem[]
