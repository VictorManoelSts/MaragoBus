import { Bell, CalendarDays, House, Ticket, UserRound } from '@lucide/vue'
import type { PortalNavigationItem } from '../types/navigation'

const reservations = {
  name: 'reservations', path: '/reservas', label: 'Minhas reservas', mobileLabel: 'Reservas', icon: CalendarDays,
} as const

export const studentNotificationsLink = {
  name: 'announcements', path: '/notificacoes', label: 'Notificações', icon: Bell,
} as const

export const studentNavigationItems = [
  { name: 'home', path: '/', label: 'Início', mobileLabel: 'Início', icon: House },
  { name: 'receipt', path: '/comprovante', label: 'Comprovante', mobileLabel: 'Comprovante', icon: Ticket },
  reservations,
  { name: 'profile', path: '/perfil', label: 'Meu perfil', mobileLabel: 'Perfil', icon: UserRound },
] as const satisfies readonly PortalNavigationItem[]
