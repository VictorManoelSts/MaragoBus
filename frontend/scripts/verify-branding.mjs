import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
const expected = JSON.parse(await readFile(new URL('./branding-sha256.json', import.meta.url), 'utf8'))
for (const [name, hash] of Object.entries(expected)) {
  const data = await readFile(new URL('../packages/shared/src/assets/branding/' + name, import.meta.url))
  if (createHash('sha256').update(data).digest('hex') !== hash) throw new Error('SVG alterado: ' + name)
  console.log('SHA-256 OK: ' + name)
}
