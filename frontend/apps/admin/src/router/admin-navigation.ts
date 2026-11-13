import {
  BookOpen, BookOpenCheck, CalendarDays, GraduationCap, LayoutDashboard,
  MapPin, MessageSquareWarning, University, UserRound, UsersRound,
} from '@lucide/vue'
import type { Component } from 'vue'

interface AdminNavigationItem {
  name: string
  path: string
  label: string
  icon: Component
  description?: string
}

interface AdminNavigationGroup {
  name: string
  label: string
  items: readonly AdminNavigationItem[]
}

// Fonte única dos grupos desktop/mobile e do registro de rotas.
export const adminNavigationGroups: readonly AdminNavigationGroup[] = [
  { name: 'main', label: 'Principal', items: [
  { name: 'home', path: '/', label: 'Visão geral', icon: LayoutDashboard },
  {
    name: 'students', path: '/alunos', label: 'Alunos', icon: GraduationCap,
    description: 'Espaço para o gerenciamento dos alunos do transporte universitário.',
  },
  {
    name: 'drivers', path: '/motoristas', label: 'Motoristas', icon: UsersRound,
    description: 'Espaço para o gerenciamento dos motoristas do transporte universitário.',
  },
  {
    name: 'colleges', path: '/faculdades', label: 'Faculdades', icon: University,
    description: 'Espaço para o gerenciamento das faculdades atendidas pelo transporte universitário.',
  },
  {
    name: 'boarding-points', path: '/pontos-embarque', label: 'Pontos de embarque', icon: MapPin,
    description: 'Espaço para o gerenciamento dos pontos de embarque do transporte universitário.',
  },
  { name: 'warnings', path: '/advertencias', label: 'Solicitações de advertência', icon: MessageSquareWarning, description: 'Espaço para a consulta administrativa das solicitações de advertência.' },
  {
    name: 'profile', path: '/perfil', label: 'Meu perfil', icon: UserRound,
    description: 'Espaço para consultar as informações do perfil administrativo.',
  },
  ] },
  { name: 'complementary', label: 'Gerenciamento complementar', items: [
  {
    name: 'courses', path: '/cursos', label: 'Cursos', icon: BookOpen,
    description: 'Espaço para o gerenciamento dos cursos cadastrados no sistema.',
  },
  {
    name: 'offered-courses', path: '/cursos-ofertados', label: 'Cursos ofertados', icon: BookOpenCheck,
    description: 'Espaço para o gerenciamento dos cursos ofertados pelas faculdades.',
  },
  {
    name: 'reservations', path: '/reservas', label: 'Reservas', icon: CalendarDays,
    description: 'Espaço para a consulta administrativa das reservas de transporte universitário.',
  },
  ] },
]

export const adminNavigationItems: readonly AdminNavigationItem[] = adminNavigationGroups.flatMap(group => group.items)
