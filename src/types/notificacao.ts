import type { Timestamp } from 'firebase/firestore'

export enum TipoNotificacao {
  AberturaReservas = 'abertura_reservas',
  LembreteEncerramento = 'lembrete_encerramento',
  SuspensaoConfirmada = 'suspensao_confirmada',
  AvisoFeriado = 'aviso_feriado',
  Advertencia = 'advertencia',
}

export interface Notificacao {
  id: string
  alunoId: string
  tipo: TipoNotificacao
  titulo: string
  mensagem: string
  lida: boolean
  criadaEm: Timestamp
}
