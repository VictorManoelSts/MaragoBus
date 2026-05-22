export const BUSINESS = {
  reserva: {
    aberturaHora: 17,
    encerramentoHora: 11,
    cancelamentoHora: 16,
  },
  motorista: {
    diaSeguinteHora: 5,
  },
  suspensao: {
    advertenciasParaSuspender: 3,
    diasUteisAfastamento: 3,
  },
  notificacoes: {
    lembreteHora: 10,
    avisoFeriadoDias: [3, 1],
    adminReservaHora: 17,
  },
  senha: {
    digitosCPF: 6,
    minCaracteres: 6,
  },
  whatsapp: {
    secretaria: 'https://wa.me/5582991512687',
  },
} as const
