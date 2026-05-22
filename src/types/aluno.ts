export enum StatusAluno {
  Ativo = 'ativo',
  Suspenso = 'suspenso',
  Concluindo = 'concluindo',
}

export enum ModalidadeAluno {
  Presencial = 'presencial',
  Semipresencial = 'semipresencial',
  Online = 'online',
}

export interface Aluno {
  id: string
  nome: string
  cpf: string
  telefone: string
  endereco: string
  foto: string | null
  faculdade: string
  curso: string
  modalidade: ModalidadeAluno
  semestre: number
  anoConclusao: number
  pontoEmbarquePadrao: string
  status: StatusAluno
  dataSuspensao: string | null
  dataReativacao: string | null
  primeiroAcesso: boolean
}
