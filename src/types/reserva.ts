import type { Timestamp } from 'firebase/firestore'

export interface Reserva {
  id: string
  alunoId: string
  data: string
  pontoEscolhido: string
  criadaEm: Timestamp
}
