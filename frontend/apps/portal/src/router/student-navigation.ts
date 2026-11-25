import { Bell, CalendarDays, CalendarPlus, House, UserRound } from '@lucide/vue'
import type { PortalNavigationItem } from '../types/navigation'

interface StudentNavigationItem extends PortalNavigationItem {
  message?: string
}

// Fonte única dos destinos, rótulos e ícones das duas navegações.
export const studentNavigationItems: readonly StudentNavigationItem[] = [
  { name: 'home', path: '/', label: 'Início', icon: House },
  {
    name: 'new-reservation', path: '/reservar', label: 'Fazer reserva', icon: CalendarPlus,
    description: 'Espaço para solicitar sua reserva de transporte universitário.',
    message: 'O formulário de reserva será implementado posteriormente.',
  },
  {
    name: 'reservations', path: '/reservas', label: 'Minhas reservas', icon: CalendarDays,
  },
  {
    // Nome interno preservado para manter a compatibilidade dos links nomeados.
    name: 'announcements', path: '/notificacoes', label: 'Notificações', icon: Bell,
  },
  {
    name: 'profile', path: '/perfil', label: 'Meu perfil', icon: UserRound,
  },
]
