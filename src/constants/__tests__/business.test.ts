import { BUSINESS } from '@/constants/business'

describe('BUSINESS — janela de reserva', () => {
  it('abre às 17h', () => {
    expect(BUSINESS.reserva.aberturaHora).toBe(17)
  })

  it('encerra às 11h do dia seguinte', () => {
    expect(BUSINESS.reserva.encerramentoHora).toBe(11)
  })

  it('cancelamento disponível até 16h do dia da viagem', () => {
    expect(BUSINESS.reserva.cancelamentoHora).toBe(16)
  })

  it('abertura precede o encerramento dentro do mesmo ciclo', () => {
    expect(BUSINESS.reserva.aberturaHora).toBeGreaterThan(BUSINESS.reserva.encerramentoHora)
  })

  it('cancelamento ocorre antes da abertura do ciclo seguinte', () => {
    expect(BUSINESS.reserva.cancelamentoHora).toBeLessThan(BUSINESS.reserva.aberturaHora)
  })
})

describe('BUSINESS — suspensão', () => {
  it('suspende após exatamente 3 advertências', () => {
    expect(BUSINESS.suspensao.advertenciasParaSuspender).toBe(3)
  })

  it('suspensão dura exatamente 3 dias úteis', () => {
    expect(BUSINESS.suspensao.diasUteisAfastamento).toBe(3)
  })
})

describe('BUSINESS — notificações', () => {
  it('lembrete de encerramento enviado às 10h', () => {
    expect(BUSINESS.notificacoes.lembreteHora).toBe(10)
  })

  it('lembrete ocorre antes do encerramento das reservas', () => {
    expect(BUSINESS.notificacoes.lembreteHora).toBeLessThan(BUSINESS.reserva.encerramentoHora)
  })

  it('aviso de feriado enviado com 3 e 1 dia de antecedência', () => {
    expect(BUSINESS.notificacoes.avisoFeriadoDias).toEqual([3, 1])
  })

  it('aviso de feriado contém exatamente 2 momentos', () => {
    expect(BUSINESS.notificacoes.avisoFeriadoDias).toHaveLength(2)
  })

  it('abertura de reservas notificada às 17h', () => {
    expect(BUSINESS.notificacoes.adminReservaHora).toBe(17)
  })

  it('notificação de abertura coincide com a abertura das reservas', () => {
    expect(BUSINESS.notificacoes.adminReservaHora).toBe(BUSINESS.reserva.aberturaHora)
  })
})

describe('BUSINESS — motorista', () => {
  it('lista de amanhã disponível a partir das 5h', () => {
    expect(BUSINESS.motorista.diaSeguinteHora).toBe(5)
  })
})

describe('BUSINESS — senha', () => {
  it('senha inicial usa os 6 últimos dígitos do CPF', () => {
    expect(BUSINESS.senha.digitosCPF).toBe(6)
  })

  it('senha mínima de 6 caracteres', () => {
    expect(BUSINESS.senha.minCaracteres).toBe(6)
  })

  it('tamanho mínimo coincide com os dígitos do CPF', () => {
    expect(BUSINESS.senha.minCaracteres).toBe(BUSINESS.senha.digitosCPF)
  })
})

describe('BUSINESS — imutabilidade', () => {
  it('objeto raiz é congelado em runtime', () => {
    expect(Object.isFrozen(BUSINESS)).toBe(true)
  })

  it('bloco reserva é congelado', () => {
    expect(Object.isFrozen(BUSINESS.reserva)).toBe(true)
  })

  it('bloco suspensao é congelado', () => {
    expect(Object.isFrozen(BUSINESS.suspensao)).toBe(true)
  })

  it('bloco notificacoes é congelado', () => {
    expect(Object.isFrozen(BUSINESS.notificacoes)).toBe(true)
  })

  it('array avisoFeriadoDias é congelado', () => {
    expect(Object.isFrozen(BUSINESS.notificacoes.avisoFeriadoDias)).toBe(true)
  })

  it('bloco motorista é congelado', () => {
    expect(Object.isFrozen(BUSINESS.motorista)).toBe(true)
  })

  it('bloco senha é congelado', () => {
    expect(Object.isFrozen(BUSINESS.senha)).toBe(true)
  })
})
