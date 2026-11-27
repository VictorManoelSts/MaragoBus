import {
  Ban, BookOpen, BookOpenCheck, CalendarDays, CalendarOff, GraduationCap,
  LayoutDashboard, MapPin, Megaphone, MessageSquareWarning, University, UserRound, UsersRound,
} from '@lucide/vue'
import type { Component } from 'vue'

interface AdminNavigationItem {
  name: string
  path: string
  label: string
  title?: string
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
  {
    name: 'overview', label: 'Visão geral', items: [
      { name: 'home', path: '/', label: 'Painel', title: 'Painel administrativo', icon: LayoutDashboard },
    ],
  },
  {
    name: 'people', label: 'Pessoas', items: [
      { name: 'students', path: '/alunos', label: 'Alunos', icon: GraduationCap, description: 'Gestão dos alunos do transporte universitário.' },
      { name: 'drivers', path: '/motoristas', label: 'Motoristas', icon: UsersRound, description: 'Gestão dos motoristas do transporte universitário.' },
    ],
  },
  {
    name: 'academic', label: 'Acadêmico', items: [
      { name: 'colleges', path: '/faculdades', label: 'Faculdades', icon: University, description: 'Gestão das faculdades atendidas pelo transporte universitário.' },
      { name: 'courses', path: '/cursos', label: 'Cursos', icon: BookOpen, description: 'Gestão dos cursos cadastrados no sistema.' },
      { name: 'offered-courses', path: '/cursos-ofertados', label: 'Cursos ofertados', icon: BookOpenCheck, description: 'Gestão dos cursos ofertados pelas faculdades.' },
    ],
  },
  {
    name: 'transport', label: 'Transporte', items: [
      { name: 'boarding-points', path: '/pontos-embarque', label: 'Pontos de embarque', icon: MapPin, description: 'Gestão dos pontos de embarque do transporte universitário.' },
      { name: 'reservations', path: '/reservas', label: 'Reservas', icon: CalendarDays, description: 'Consulta administrativa das reservas de transporte universitário.' },
      { name: 'transport-closures', path: '/datas-sem-transporte', label: 'Datas sem transporte', icon: CalendarOff, description: 'Gestão do calendário de interrupções do transporte universitário.' },
    ],
  },
  {
    name: 'discipline', label: 'Disciplina', items: [
      { name: 'warnings', path: '/advertencias', label: 'Advertências', icon: MessageSquareWarning, description: 'Consulta e análise de solicitações de advertência.' },
      { name: 'suspensions', path: '/suspensoes', label: 'Suspensões', icon: Ban, description: 'Gestão das suspensões do transporte universitário.' },
    ],
  },
  {
    name: 'communication', label: 'Comunicação', items: [
      { name: 'announcements', path: '/avisos', label: 'Avisos administrativos', icon: Megaphone, description: 'Publicação de avisos do transporte universitário.' },
    ],
  },
  {
    name: 'account', label: 'Conta', items: [
      { name: 'profile', path: '/perfil', label: 'Meu perfil', icon: UserRound, description: 'Consulta das informações do perfil administrativo.' },
    ],
  },
]

export const adminNavigationItems: readonly AdminNavigationItem[] = adminNavigationGroups.flatMap(group => group.items)
