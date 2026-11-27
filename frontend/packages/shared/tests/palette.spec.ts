import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { describe, expect, it } from 'vitest'

// A suíte é executada na raiz do monorepositório; import.meta.url pode ser virtual no Vitest.
const source = (path: string) => readFileSync(resolvePath('packages/shared', path), 'utf8')
const tokens = source('src/styles/tokens.css')
const base = source('src/styles/base.css')
const variables = rule(tokens, ':root')
const darkOverrides = rule(tokens, ':root[data-theme="dark"]')
const darkVariables = { ...variables, ...darkOverrides }

function resolve(name: string, values = variables, visited = new Set<string>()): string {
  if (visited.has(name)) throw new Error('Referência circular: ' + name)
  visited.add(name)
  const value = values[name]
  if (!value) throw new Error('Token ausente: ' + name)
  const alias = /^var\((--[\w-]+)\)$/.exec(value)
  return alias ? resolve(alias[1]!, values, visited) : value
}
function rule(css: string, selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(escaped + '\\s*\\{([^{}]*)\\}').exec(css)
  if (!match) throw new Error('Regra ausente: ' + selector)
  return Object.fromEntries(match[1]!.split(';').filter(item => item.trim()).map(item => {
    const separator = item.indexOf(':')
    return [item.slice(0, separator).trim(), item.slice(separator + 1).trim()]
  }))
}
function luminance(hex: string) {
  const channels = hex.slice(1).match(/../g)!.map(value => parseInt(value, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
}
function contrast(first: string, second: string, theme = variables) {
  const values = [luminance(resolve(first, theme)), luminance(resolve(second, theme))].sort((a, b) => b - a)
  return (values[0]! + 0.05) / (values[1]! + 0.05)
}

describe('Estados do Portal', () => {
  const portal = source('../../apps/portal/src/styles.css')
  const lightPortal = rule(portal, ':root:not([data-theme="dark"])')
  const darkPortal = rule(portal, ':root[data-theme="dark"]')

  it.each(['success', 'danger', 'warning', 'info'])('garante contraste do estado %s nos dois temas', state => {
    const text = '--mb-' + state
    const surface = text + '-surface'
    const border = text + '-border'
    const dark = { ...darkVariables, ...darkPortal }

    for (const theme of [
      variables,
      { ...variables, ...lightPortal },
      dark,
    ]) {
      expect(contrast(text, surface, theme)).toBeGreaterThanOrEqual(4.5)
    }
    expect(contrast(border, surface, dark)).toBeGreaterThanOrEqual(3)
  })

  it('distingue as quatro variantes no escuro e mantém foco e erro visíveis', () => {
    const theme = { ...darkVariables, ...darkPortal }
    for (const suffix of ['', '-surface', '-border']) {
      const colors = ['success', 'danger', 'warning', 'info'].map(state => resolve('--mb-' + state + suffix, theme))
      expect(new Set(colors).size).toBe(4)
    }
    expect(contrast('--mb-danger', '--mb-surface', theme)).toBeGreaterThanOrEqual(4.5)
    for (const surface of ['--mb-app', '--mb-surface', '--mb-hover']) {
      expect(contrast('--mb-focus', surface, theme)).toBeGreaterThanOrEqual(3)
    }
    expect(contrast('--mb-identity', '--mb-on-primary', theme)).toBeGreaterThanOrEqual(4.5)
  })
})

it('preserva a paleta oficial e acompanha o esquema efetivo nos controles nativos', () => {
  for (const name of Object.keys(darkOverrides)) {
    expect(name).not.toMatch(/^--mb-brand-/)
    expect(variables).toHaveProperty(name)
  }
  expect(rule(base, ':root')['color-scheme']).toBe('light')
  expect(rule(base, ':root[data-theme="dark"]')['color-scheme']).toBe('dark')
})

describe('Paleta oficial MaragoBus', () => {
  it.each([
    ['--mb-brand-navy', '#16466B'], ['--mb-brand-ocean', '#2479A8'],
    ['--mb-brand-aqua', '#48A9C5'], ['--mb-brand-mist', '#EAF4F8'], ['--mb-brand-white', '#FFFFFF'],
  ])('centraliza %s com o valor exato %s', (name, value) => {
    expect(variables[name!]).toBe(value)
    expect(tokens.match(new RegExp(value!, 'gi'))).toHaveLength(1)
  })

  it('define somente as cinco cores de marca aprovadas e aliases semânticos', () => {
    expect(Object.keys(variables).filter(name => name.startsWith('--mb-brand-'))).toHaveLength(5)
    expect(variables['--mb-primary']).toBe('var(--mb-brand-ocean)')
    expect(resolve('--mb-primary-hover')).toBe('#16466B')
    expect(resolve('--mb-heading')).toBe('#16466B')
    expect(resolve('--mb-focus')).toBe('#16466B')
    expect(resolve('--mb-accent')).toBe('#48A9C5')
    expect(resolve('--mb-app')).toBe('#EAF4F8')
    expect(resolve('--mb-surface')).toBe('#FFFFFF')
  })

  it('exporta a identidade pelos namespaces existentes do Tailwind CSS 4', () => {
    expect(tokens).toContain('@theme inline')
    for (const [utility, variable] of [
      ['primary', 'primary'], ['identity', 'identity'], ['heading', 'heading'],
      ['accent', 'accent'], ['app', 'app'], ['surface', 'surface'], ['focus', 'focus'],
    ]) expect(tokens).toContain('--color-' + utility + ': var(--mb-' + variable + ')')
  })

  it('preserva os valores de feedback e indisponibilidade sem recolori-los como marca', () => {
    for (const state of ['success', 'warning', 'danger', 'info']) {
      expect(variables['--mb-' + state]).toBe('#303030')
      expect(variables['--mb-' + state + '-surface']).toBe('#f3f3f3')
      expect(variables['--mb-' + state + '-border']).toBe('#767676')
      expect(rule(base, '.mb-feedback--' + state)['--feedback-text']).toBe('var(--mb-' + state + ')')
    }
    expect(variables['--mb-disabled']).toBe('#ededed')
    expect(variables['--mb-disabled-text']).toBe('#686868')
  })
})

describe('Aplicação dos tokens aos componentes', () => {
  it('usa ações primárias e seus estados com cores acessíveis', () => {
    expect(rule(base, '.mb-button--primary')).toMatchObject({ background: 'var(--mb-primary)', color: 'var(--mb-on-primary)' })
    expect(rule(base, '.mb-button--primary:hover:not(:disabled)').background).toBe('var(--mb-primary-hover)')
    expect(rule(base, '.mb-button--secondary')).toMatchObject({ background: 'var(--mb-secondary)', color: 'var(--mb-on-secondary)', 'border-color': 'var(--mb-primary)' })
    expect(rule(base, '.mb-button--outline').color).toBe('var(--mb-identity)')
    expect(rule(base, '.mb-button--ghost').color).toBe('var(--mb-identity)')
  })

  it('mantém campos e selects brancos com foco e erro distintos', () => {
    expect(rule(base, '.mb-control')).toMatchObject({ background: 'var(--mb-surface)', border: '1px solid var(--mb-control-border)' })
    expect(rule(base, ':focus-visible').outline).toBe('2px solid var(--mb-focus)')
    expect(rule(base, '.mb-control:hover:not(:disabled):not([aria-invalid="true"])')['border-color']).toBe('var(--mb-primary)')
    expect(rule(base, '.mb-control[aria-invalid="true"]').border).toBe('2px solid var(--mb-danger)')
    for (const component of ['BaseInput', 'BaseSelect']) {
      expect(source('src/components/' + component + '.vue')).toContain('mb-control')
    }
  })

  it('usa superfícies brancas para card e modal e identidade no título do modal', () => {
    for (const selector of ['.mb-card', '.mb-modal']) expect(rule(base, selector).background).toBe('var(--mb-surface)')
    expect(rule(base, '.mb-modal__title').color).toBe('var(--mb-heading)')
  })

  it('aplica a identidade somente ao badge neutro, preservando alertas funcionais', () => {
    expect(rule(base, '.mb-feedback--neutral')).toMatchObject({
      '--feedback-text': 'var(--mb-identity)', '--feedback-surface': 'var(--mb-secondary)',
    })
    expect(rule(base, '.mb-badge').color).toBe('var(--feedback-text)')
    expect(rule(base, '.mb-alert').color).toBe('var(--feedback-text)')
    expect(rule(base, '.mb-alert').background).toBe('var(--feedback-surface)')
  })

  it('preserva os estados disabled sem herdar o hover de marca', () => {
    expect(rule(base, '.mb-button:disabled, .mb-control:disabled')).toMatchObject({
      background: 'var(--mb-disabled)', color: 'var(--mb-disabled-text)',
    })
    expect(base).toContain('.mb-button--secondary:hover:not(:disabled)')
  })

  it.each(['portal', 'admin'])('usa os mesmos tokens nos layouts e na navegação do %s', app => {
    const styles = source('../../apps/' + app + '/src/styles.css')
    const selector = app === 'portal' ? '.portal-navigation__link' : '.admin-sidebar__link'
    expect(styles).toContain('@import "@maragobus/shared/styles.css"')
    expect(rule(styles, selector + '[aria-current="page"]')).toMatchObject({
      background: 'var(--mb-secondary)', color: 'var(--mb-on-secondary)',
      'box-shadow': 'inset 3px 0 0 var(--mb-identity)',
    })
    expect(rule(styles, selector + ':focus-visible').outline).toBe('2px solid var(--mb-focus)')
    const layout = source('../../apps/' + app + '/src/layouts/' + (app === 'portal' ? 'PortalLayout' : 'AdminLayout') + '.vue')
    expect(layout).toContain('bg-app text-content')
    if (app === 'admin') expect(layout).toContain('border-t-accent')
    expect(layout).toContain('bg-surface')
  })

  it('mantém o drawer na superfície compartilhada com backdrop existente', () => {
    const styles = source('../../apps/admin/src/styles.css')
    expect(rule(styles, '.admin-drawer').background).toBe('var(--mb-surface)')
    expect(rule(styles, '.admin-drawer::backdrop').background).toBe('var(--mb-backdrop)')
  })
})

describe('Contrastes calculados dos tokens', () => {
  const pairs: [string, string, number][] = [
    ['--mb-on-primary', '--mb-primary', 4.5],
    ['--mb-on-primary', '--mb-primary-hover', 4.5],
    ['--mb-on-secondary', '--mb-secondary', 4.5],
    ['--mb-on-secondary', '--mb-secondary-hover', 4.5],
    ['--mb-text', '--mb-app', 4.5],
    ['--mb-text', '--mb-surface', 4.5],
    ['--mb-heading', '--mb-app', 4.5],
    ['--mb-heading', '--mb-surface', 4.5],
    ['--mb-text-muted', '--mb-app', 4.5],
    ['--mb-text-muted', '--mb-surface', 4.5],
    ['--mb-identity', '--mb-surface', 4.5],
    ['--mb-identity', '--mb-hover', 4.5],
    ['--mb-focus', '--mb-app', 3],
    ['--mb-focus', '--mb-surface', 3],
    ['--mb-on-primary', '--mb-identity', 3],
    ['--mb-identity', '--mb-secondary', 3],
    ['--mb-text-muted', '--mb-secondary', 3],
    ['--mb-control-border', '--mb-secondary', 3],
    ['--mb-control-border', '--mb-surface', 3],
    ['--mb-primary', '--mb-secondary', 3],
    ['--mb-disabled-text', '--mb-disabled', 4.5],
    ['--mb-success', '--mb-success-surface', 4.5],
    ['--mb-warning', '--mb-warning-surface', 4.5],
    ['--mb-danger', '--mb-danger-surface', 4.5],
    ['--mb-info', '--mb-info-surface', 4.5],
  ]
  it.each(pairs)('%s sobre %s tem contraste mínimo de %s:1', (foreground, background, minimum) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(minimum)
  })
  it.each(pairs)('%s sobre %s tem contraste escuro mínimo de %s:1', (foreground, background, minimum) => {
    expect(contrast(foreground, background, darkVariables)).toBeGreaterThanOrEqual(minimum)
  })
})
