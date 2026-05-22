export const BUSINESS = Object.freeze({
  reserva: Object.freeze({
    aberturaHora: 17,
    encerramentoHora: 11,
    cancelamentoHora: 16,
  }),
  motorista: Object.freeze({
    diaSeguinteHora: 5,
  }),
  suspensao: Object.freeze({
    advertenciasParaSuspender: 3,
    diasUteisAfastamento: 3,
  }),
  notificacoes: Object.freeze({
    lembreteHora: 10,
    avisoFeriadoDias: Object.freeze([3, 1] as const),
    adminReservaHora: 17,
  }),
  senha: Object.freeze({
    digitosCPF: 6,
    minCaracteres: 6,
  }),
  whatsapp: Object.freeze({
    secretaria: 'https://wa.me/5582991512687',
  }),
})
