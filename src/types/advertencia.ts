import type { Timestamp } from 'firebase/firestore'

export enum TipoAdvertencia {
  Solicitacao = 'solicitacao',
  Direta = 'direta',
}

export enum StatusSolicitacao {
  Pendente = 'pendente',
  Confirmada = 'confirmada',
  Rejeitada = 'rejeitada',
}

export interface Advertencia {
  id: string
  alunoId: string
  motivo: string
  aplicadaPor: string
  tipo: TipoAdvertencia
  data: Timestamp
}

export interface Solicitacao {
  id: string
  alunoId: string
  motoristaId: string
  motivo: string
  status: StatusSolicitacao
  data: Timestamp
}

export interface Punicao {
  id: string
  alunoId: string
  motivos: string[]
  explicacaoAdmin: string
  dataInicio: string
  dataFim: string
}
