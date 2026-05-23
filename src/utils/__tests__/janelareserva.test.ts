import { janelaAberta, proximoDiaUtil, cancelamentoPermitido } from '@/utils/janelareserva'

// Referência de datas (2024-01-01 = segunda-feira)
// 2024-01-15 = segunda
// 2024-01-19 = sexta
// 2024-01-20 = sábado
// 2024-01-21 = domingo
// 2024-01-22 = segunda
// 2024-01-23 = terça
// 2024-01-24 = quarta
// 2024-01-25 = quinta
// 2024-01-26 = sexta
// 2024-01-29 = segunda
// 2024-02-12 = segunda (carnaval)
// 2024-02-13 = terça  (carnaval)
// 2024-02-14 = quarta (cinzas)

/** Cria Date em hora local para tornar os testes legíveis */
function h(ano: number, mes: number, dia: number, hora: number, min = 0): Date {
  return new Date(ano, mes - 1, dia, hora, min)
}

/** Cria Date local sem hora (para comparar datas) */
function d(ano: number, mes: number, dia: number): Date {
  return new Date(ano, mes - 1, dia)
}

const SEM_FERIADOS: string[] = []

// ── janelaAberta ──────────────────────────────────────────────────────────────

describe('janelaAberta — limites exatos da abertura (17h)', () => {
  it('retorna true exatamente às 17h00 (abertura da janela)', () => {
    expect(janelaAberta(h(2024, 1, 15, 17, 0))).toBe(true)
  })

  it('retorna false às 16h59 (um minuto antes da abertura)', () => {
    expect(janelaAberta(h(2024, 1, 15, 16, 59))).toBe(false)
  })

  it('retorna true às 17h01 (logo após a abertura)', () => {
    expect(janelaAberta(h(2024, 1, 15, 17, 1))).toBe(true)
  })
})

describe('janelaAberta — limites exatos do encerramento (11h)', () => {
  it('retorna false exatamente às 11h00 (encerramento da janela)', () => {
    expect(janelaAberta(h(2024, 1, 15, 11, 0))).toBe(false)
  })

  it('retorna true às 10h59 (último minuto antes do encerramento)', () => {
    expect(janelaAberta(h(2024, 1, 15, 10, 59))).toBe(true)
  })

  it('retorna false às 11h01 (logo após o encerramento)', () => {
    expect(janelaAberta(h(2024, 1, 15, 11, 1))).toBe(false)
  })
})

describe('janelaAberta — virada de meia-noite', () => {
  it('retorna true à meia-noite (00h00) — janela do dia anterior continua aberta', () => {
    expect(janelaAberta(h(2024, 1, 16, 0, 0))).toBe(true)
  })

  it('retorna true às 00h01 (madrugada)', () => {
    expect(janelaAberta(h(2024, 1, 16, 0, 1))).toBe(true)
  })

  it('retorna true às 23h59 (final do dia, janela noturna aberta)', () => {
    expect(janelaAberta(h(2024, 1, 15, 23, 59))).toBe(true)
  })
})

describe('janelaAberta — período fechado (11h–17h)', () => {
  it('retorna false às 12h', () => {
    expect(janelaAberta(h(2024, 1, 15, 12))).toBe(false)
  })

  it('retorna false às 14h (meio do período fechado)', () => {
    expect(janelaAberta(h(2024, 1, 15, 14))).toBe(false)
  })

  it('retorna false às 16h (antes da abertura)', () => {
    expect(janelaAberta(h(2024, 1, 15, 16))).toBe(false)
  })
})

// ── proximoDiaUtil ─────────────────────────────────────────────────────────────

describe('proximoDiaUtil — dias úteis normais (retorna o próprio dia)', () => {
  it('retorna a própria segunda-feira quando não há feriado', () => {
    expect(proximoDiaUtil(h(2024, 1, 15, 0), SEM_FERIADOS).toDateString())
      .toBe(d(2024, 1, 15).toDateString())
  })

  it('retorna a própria sexta-feira quando não há feriado', () => {
    expect(proximoDiaUtil(h(2024, 1, 19, 0), SEM_FERIADOS).toDateString())
      .toBe(d(2024, 1, 19).toDateString())
  })

  it('retorna a própria terça quando não há feriado', () => {
    expect(proximoDiaUtil(h(2024, 1, 23, 0), SEM_FERIADOS).toDateString())
      .toBe(d(2024, 1, 23).toDateString())
  })
})

describe('proximoDiaUtil — fins de semana', () => {
  it('avança de sábado (20/01) para segunda-feira (22/01)', () => {
    expect(proximoDiaUtil(h(2024, 1, 20, 0), SEM_FERIADOS).toDateString())
      .toBe(d(2024, 1, 22).toDateString())
  })

  it('avança de domingo (21/01) para segunda-feira (22/01)', () => {
    expect(proximoDiaUtil(h(2024, 1, 21, 0), SEM_FERIADOS).toDateString())
      .toBe(d(2024, 1, 22).toDateString())
  })
})

describe('proximoDiaUtil — feriado simples em dia útil', () => {
  it('pula feriado em segunda (22/01) e retorna terça (23/01)', () => {
    expect(proximoDiaUtil(h(2024, 1, 22, 0), ['2024-01-22']).toDateString())
      .toBe(d(2024, 1, 23).toDateString())
  })

  it('pula feriado em sexta (19/01) e retorna segunda (22/01)', () => {
    expect(proximoDiaUtil(h(2024, 1, 19, 0), ['2024-01-19']).toDateString())
      .toBe(d(2024, 1, 22).toDateString())
  })

  it('pula feriado em quarta (24/01) e retorna quinta (25/01)', () => {
    expect(proximoDiaUtil(h(2024, 1, 24, 0), ['2024-01-24']).toDateString())
      .toBe(d(2024, 1, 25).toDateString())
  })
})

describe('proximoDiaUtil — feriados encadeados', () => {
  it('pula dois feriados seguidos (seg+ter) e retorna quarta', () => {
    expect(
      proximoDiaUtil(h(2024, 1, 22, 0), ['2024-01-22', '2024-01-23']).toDateString()
    ).toBe(d(2024, 1, 24).toDateString())
  })

  it('pula carnaval (seg 12/02 + ter 13/02) e retorna quarta-feira de cinzas (14/02)', () => {
    expect(
      proximoDiaUtil(h(2024, 2, 12, 0), ['2024-02-12', '2024-02-13']).toDateString()
    ).toBe(d(2024, 2, 14).toDateString())
  })

  it('pula feriado em segunda após fim de semana prolongado (sáb→dom→seg=feriado → ter)', () => {
    // Entrada: sábado 20/01; segunda 22/01 é feriado → resultado: terça 23/01
    expect(
      proximoDiaUtil(h(2024, 1, 20, 0), ['2024-01-22']).toDateString()
    ).toBe(d(2024, 1, 23).toDateString())
  })

  it('pula semana completa de feriados (seg–sex 22-26/01) e retorna segunda seguinte (29/01)', () => {
    const semana = ['2024-01-22', '2024-01-23', '2024-01-24', '2024-01-25', '2024-01-26']
    expect(proximoDiaUtil(h(2024, 1, 22, 0), semana).toDateString())
      .toBe(d(2024, 1, 29).toDateString())
  })

  it('pula semana completa iniciando no sábado (sáb + seg-sex feriados → segunda seguinte)', () => {
    // Entrada: sábado 20/01; toda semana 22-26 é feriado → segunda 29/01
    const semana = ['2024-01-22', '2024-01-23', '2024-01-24', '2024-01-25', '2024-01-26']
    expect(proximoDiaUtil(h(2024, 1, 20, 0), semana).toDateString())
      .toBe(d(2024, 1, 29).toDateString())
  })

  it('pula três feriados encadeados (ter+qua+qui) e retorna sexta', () => {
    expect(
      proximoDiaUtil(h(2024, 1, 23, 0), ['2024-01-23', '2024-01-24', '2024-01-25']).toDateString()
    ).toBe(d(2024, 1, 26).toDateString())
  })
})

describe('proximoDiaUtil — feriados que não afetam o cálculo', () => {
  it('ignora feriado em data futura distante', () => {
    expect(proximoDiaUtil(h(2024, 1, 15, 0), ['2024-02-12']).toDateString())
      .toBe(d(2024, 1, 15).toDateString())
  })

  it('ignora feriado em data passada', () => {
    expect(proximoDiaUtil(h(2024, 1, 16, 0), ['2024-01-15']).toDateString())
      .toBe(d(2024, 1, 16).toDateString())
  })

  it('feriado no sábado não afeta o cálculo (sábado já é não-útil)', () => {
    // sáb 20/01 com "feriado" no próprio sábado → ainda avança para seg 22/01
    expect(proximoDiaUtil(h(2024, 1, 20, 0), ['2024-01-20']).toDateString())
      .toBe(d(2024, 1, 22).toDateString())
  })
})

describe('proximoDiaUtil — preserva apenas a data, ignora a hora de entrada', () => {
  it('retorna o mesmo dia independentemente da hora passada (17h vs 00h)', () => {
    const viaMeiaNoite = proximoDiaUtil(h(2024, 1, 22, 0), SEM_FERIADOS)
    const viaAberturaJanela = proximoDiaUtil(h(2024, 1, 22, 17), SEM_FERIADOS)
    expect(viaMeiaNoite.toDateString()).toBe(viaAberturaJanela.toDateString())
  })
})

// ── cancelamentoPermitido ──────────────────────────────────────────────────────

describe('cancelamentoPermitido — limite exato (16h)', () => {
  it('retorna false exatamente às 16h00 (prazo expirado)', () => {
    expect(cancelamentoPermitido(h(2024, 1, 15, 16, 0))).toBe(false)
  })

  it('retorna true às 15h59 (último minuto permitido)', () => {
    expect(cancelamentoPermitido(h(2024, 1, 15, 15, 59))).toBe(true)
  })

  it('retorna false às 16h01 (prazo claramente expirado)', () => {
    expect(cancelamentoPermitido(h(2024, 1, 15, 16, 1))).toBe(false)
  })
})

describe('cancelamentoPermitido — horários permitidos', () => {
  it('retorna true à meia-noite', () => {
    expect(cancelamentoPermitido(h(2024, 1, 15, 0))).toBe(true)
  })

  it('retorna true às 08h (início do dia)', () => {
    expect(cancelamentoPermitido(h(2024, 1, 15, 8))).toBe(true)
  })

  it('retorna true às 10h59 (janela de reserva ainda aberta)', () => {
    expect(cancelamentoPermitido(h(2024, 1, 15, 10, 59))).toBe(true)
  })

  it('retorna true às 15h (tarde — ainda antes do prazo)', () => {
    expect(cancelamentoPermitido(h(2024, 1, 15, 15))).toBe(true)
  })
})

describe('cancelamentoPermitido — horários bloqueados', () => {
  it('retorna false às 17h (janela de reserva já aberta, cancelamento encerrado)', () => {
    expect(cancelamentoPermitido(h(2024, 1, 15, 17))).toBe(false)
  })

  it('retorna false às 20h', () => {
    expect(cancelamentoPermitido(h(2024, 1, 15, 20))).toBe(false)
  })

  it('retorna false às 23h59', () => {
    expect(cancelamentoPermitido(h(2024, 1, 15, 23, 59))).toBe(false)
  })
})
