export function cpfDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11)
}

export function formatCpf(value: string): string {
  return cpfDigits(value)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3}\.\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3}\.\d{3}\.\d{3})(\d)/, '$1-$2')
}

export function cpfError(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return 'Informe seu CPF.'
  if (digits.length !== 11) return 'O CPF deve conter 11 dígitos.'
  if (/^(\d)\1{10}$/.test(digits)) return 'Informe um CPF válido.'
  for (const length of [9, 10]) {
    let sum = 0
    for (let index = 0; index < length; index++) {
      sum += Number(digits[index]) * (length + 1 - index)
    }
    const remainder = (sum * 10) % 11
    if ((remainder === 10 ? 0 : remainder) !== Number(digits[length])) {
      return 'Informe um CPF válido.'
    }
  }
  return ''
}
