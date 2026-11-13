import { describe, expect, it } from 'vitest'
import { cpfDigits, cpfError, formatCpf } from '../src/utils/cpf'

describe('CPF local', () => {
  it.each(['52998224725', '11144477735', '01234567890', '529.982.247-25'])('aceita verificadores válidos: %s', value => {
    expect(cpfError(value)).toBe('')
  })
  it.each(Array.from({ length: 10 }, (_, digit) => String(digit).repeat(11)))('rejeita sequência repetida %s', value => {
    expect(cpfError(value)).toBe('Informe um CPF válido.')
  })
  it.each(['52998224715', '52998224724'])('rejeita alteração de cada verificador: %s', value => {
    expect(cpfError(value)).toBe('Informe um CPF válido.')
  })
  it('distingue obrigatório de comprimento incorreto', () => {
    expect(cpfError('')).toBe('Informe seu CPF.')
    expect(cpfError('123')).toBe('O CPF deve conter 11 dígitos.')
    expect(cpfError('529982247250')).toBe('O CPF deve conter 11 dígitos.')
  })
  it('formata progressivamente sem incluir pontuação no conteúdo efetivo', () => {
    expect(['1', '123', '1234', '1234567', '1234567890'].map(formatCpf)).toEqual(['1', '123', '123.4', '123.456.7', '123.456.789-0'])
    expect(cpfDigits('abc012.345.678-909')).toBe('01234567890')
  })
})
