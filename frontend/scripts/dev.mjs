import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
const servers = []
let closing = false
async function close(code = 0) {
  if (closing) return
  closing = true
  await Promise.allSettled(servers.map(server => server.close()))
  process.exitCode = code
}
process.once('SIGINT', () => void close())
process.once('SIGTERM', () => void close())
try {
  for (const app of ['portal', 'admin']) {
    const server = await createServer({ root: fileURLToPath(new URL('../apps/' + app + '/', import.meta.url)) })
    servers.push(server)
    await server.listen()
    server.printUrls()
  }
} catch (error) {
  console.error(error)
  await close(1)
}
