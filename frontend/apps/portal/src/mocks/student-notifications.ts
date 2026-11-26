interface DemonstrationNotice {
  id: string
  title: string
  message: string
  publishedAt: string
}

const notices: readonly DemonstrationNotice[] = [
  {
    id: 'demo-boarding',
    title: 'Exemplo de orientação de embarque',
    message: 'Este exemplo mostra como uma orientação sobre pontos de embarque apareceria no Portal.',
    publishedAt: '2026-11-16T15:00:00Z',
  },
  {
    id: 'demo-calendar',
    title: 'Exemplo de comunicado sobre o calendário',
    message: 'Este exemplo mostra como um comunicado sobre o calendário de viagens apareceria no Portal.',
    publishedAt: '2026-11-18T15:00:00Z',
  },
]

export function getDemonstrationNotices(studentId?: string): readonly DemonstrationNotice[] {
  return import.meta.env.DEV && !import.meta.env.PROD && studentId === 'mock-student-test' ? notices : []
}
