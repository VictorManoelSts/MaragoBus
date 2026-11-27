import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const hashes: Record<string, string> = JSON.parse(
  readFileSync(resolve('scripts/branding-sha256.json'), 'utf8'),
)

describe('Integridade da identidade visual oficial', () => {
  it.each(Object.entries(hashes))('preserva os bytes de %s', (filename, expected) => {
    const original = readFileSync(resolve('packages/shared/src/assets/branding', filename))
    expect(createHash('sha256').update(original).digest('hex')).toBe(expected)
  })
})

function readSvg(filename: string) {
  const source = readFileSync(resolve('packages/shared/src/assets/branding', filename), 'utf8')
  return new DOMParser().parseFromString(source, 'image/svg+xml').documentElement
}

function contours(path: Element) {
  let x = 0
  let y = 0
  return path.getAttribute('d')!.trim().split(/(?=[Mm])/).map(contour => {
    const [, command, dx, dy, outline] = contour.trim().match(/^([Mm])\s+([\d.-]+),([\d.-]+)\s+(.+)$/)!
    x = (command === 'm' ? x : 0) + Number(dx)
    y = (command === 'm' ? y : 0) + Number(dy)
    return [x.toFixed(5), y.toFixed(5), outline]
  })
}

it('recolore somente os contornos originais e mantém transparente a variante horizontal escura', () => {
  const original = readSvg('logo-horizontal.svg')
  const dark = readSvg('logo-horizontal-escuro.svg')
  expect(dark.tagName).toBe('svg')
  for (const attr of ['width', 'height', 'viewBox', 'style']) {
    expect(dark.getAttribute(attr)).toBe(original.getAttribute(attr))
  }
  expect([...dark.children].map(child => child.localName)).toEqual(['defs', 'namedview', 'g'])
  expect(dark.querySelector('defs')!.outerHTML).toBe(original.querySelector('defs')!.outerHTML)
  const paths = [...dark.querySelector('g')!.children]
  expect(paths.map(path => path.localName)).toEqual(Array(10).fill('path'))
  const originalPaths = [...original.querySelectorAll('g > path')]
  const colorGroups = [
    { part: 'simbolo', start: 0, end: 5, fill: '#00d5f5' },
    { part: 'marago', start: 5, end: 13, fill: '#80bfff' },
    { part: 'bus', start: 13, end: 18, fill: '#ffffff' },
    { part: 'marago-iniciais', start: 18, end: 20, fill: '#80bfff' },
    { part: 'simbolo-detalhes', start: 20, end: 22, fill: '#00d5f5' },
  ]
  for (const [index, source] of originalPaths.entries()) {
    const originalContours = contours(source)
    for (const [groupIndex, { part, start, end, fill }] of colorGroups.entries()) {
      const path = paths[index * colorGroups.length + groupIndex]
      expect(path.id).toBe(`${source.id}-${part}`)
      expect(contours(path)).toEqual(originalContours.slice(start, end))
      expect(path.getAttribute('style')).toBe(`fill:${fill};fill-opacity:1`)
      expect(path.getAttribute('transform')).toBe(source.getAttribute('transform'))
      expect(path.getAttribute('clip-path')).toBe(source.getAttribute('clip-path'))
    }
  }
})
