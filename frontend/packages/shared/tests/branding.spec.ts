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
