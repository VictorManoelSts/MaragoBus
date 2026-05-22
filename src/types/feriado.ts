export enum TipoFeriado {
  Nacional = 'nacional',
  Regional = 'regional',
  Avulso = 'avulso',
}

export interface Feriado {
  id: string
  data: string
  nome: string
  tipo: TipoFeriado
}
