// Capturas locais com Edge/Chromium instalado; nenhuma biblioteca adicional.
// Uso: node scripts/capture-driver-evidence.mjs [caminho-do-browser]
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

const executable = process.argv[2] ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const baseUrl = 'http://localhost:5173'
const output = fileURLToPath(new URL('../docs/etapas/evidencias/03.3/', import.meta.url))
await fetch(baseUrl)
const profile = await mkdtemp(join(tmpdir(), 'maragobus-03.3-'))
const browser = spawn(executable, [
  '--headless', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank',
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
let startupError
let log = ''
browser.once('error', error => { startupError = error })
browser.stderr.on('data', data => { log = (log + data).slice(-4000) })
let socket
const pending = new Map()
let sequence = 0
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Timeout: ' + method)) }, 15000)
    pending.set(id, { resolve, reject, timer })
    socket.send(JSON.stringify({ id, method, params }))
  })
}
async function evaluate(expression) {
  const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}
const destinations = [
  { slug: 'passageiros', title: 'Lista de passageiros' },
  { slug: 'resumo', title: 'Resumo por faculdade e ponto de embarque' },
  { slug: 'perfil', title: 'Perfil do motorista' },
]
try {
  let port
  for (let attempt = 0; attempt < 150; attempt++) {
    if (startupError) throw startupError
    try {
      port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0].trim()
      if (port) break
    } catch {}
    await delay(100)
  }
  if (!port) throw new Error('Edge não iniciou a depuração local: ' + log)
  const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json()
  const target = targets.find(item => item.type === 'page')
  if (!target) throw new Error('Nenhuma página de captura disponível')
  socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    const request = pending.get(message.id)
    if (!request) return
    clearTimeout(request.timer)
    pending.delete(message.id)
    if (message.error) request.reject(new Error(JSON.stringify(message.error)))
    else request.resolve(message.result)
  })
  await call('Page.enable')
  const version = await call('Browser.getVersion')
  await mkdir(output, { recursive: true })
  const metrics = { browser: version.product, capturedAt: new Date().toISOString(), pages: [] }
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000, mobile: false },
    { name: 'mobile', width: 390, height: 844, mobile: true },
  ]) {
    await call('Emulation.setDeviceMetricsOverride', {
      width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile,
    })
    await call('Emulation.setTouchEmulationEnabled', { enabled: viewport.mobile })
    for (const destination of destinations) {
      const path = '/motorista/' + destination.slug
      await call('Page.navigate', { url: baseUrl + path })
      let ready = false
      for (let attempt = 0; attempt < 150; attempt++) {
        ready = await evaluate('location.pathname === ' + JSON.stringify(path) +
          ' && document.querySelector("main h1")?.textContent === ' + JSON.stringify(destination.title))
        if (ready) break
        await delay(100)
      }
      if (!ready) throw new Error('Página não renderizou: ' + path)
      await evaluate('document.fonts.ready.then(() => true)')
      const measurement = await evaluate(`(() => {
        const rect = element => {
          const { x, y, width, height, bottom, right } = element.getBoundingClientRect()
          return { x, y, width, height, bottom, right }
        }
        const navs = [...document.querySelectorAll('nav')].filter(nav => nav.getClientRects().length > 0)
        const nav = navs[0]
        return {
          path: location.pathname, title: document.querySelector('h1').textContent,
          viewport: { width: innerWidth, height: innerHeight },
          horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth,
          visibleNavigations: navs.length, links: [...nav.querySelectorAll('a')].map(link => link.textContent.trim()),
          active: nav.querySelector('a[aria-current="page"]')?.getAttribute('href'),
          nav: rect(nav), main: rect(document.querySelector('main')),
          card: rect(document.querySelector('.mb-card')), logo: rect(document.querySelector('header img')),
          mainCount: document.querySelectorAll('main').length,
          font: getComputedStyle(document.querySelector('main')).fontFamily,
          minimumLinkHeight: Math.min(...[...nav.querySelectorAll('a')].map(link => link.getBoundingClientRect().height)),
        }
      })()`)
      const screenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      const filename = destination.slug + '-' + viewport.name + '.png'
      await writeFile(join(output, filename), Buffer.from(screenshot.data, 'base64'))
      const valid = measurement.viewport.width === viewport.width &&
        !measurement.horizontalOverflow && measurement.visibleNavigations === 1 &&
        measurement.links.length === 3 && measurement.active === path && measurement.mainCount === 1 &&
        measurement.minimumLinkHeight >= 44 &&
        (!viewport.mobile || measurement.card.bottom <= measurement.nav.y + 1)
      metrics.pages.push({ filename, valid, ...measurement })
      await writeFile(join(output, 'metrics.json'), JSON.stringify(metrics, null, 2) + '\n')
      console.log(filename + ': ' + (valid ? 'OK' : 'FALHOU'))
      if (!valid) throw new Error('Falha de geometria/navegação: ' + JSON.stringify(measurement))
    }
  }
} finally {
  try { if (socket?.readyState === WebSocket.OPEN) await call('Browser.close') } catch {}
  socket?.close()
  for (const request of pending.values()) clearTimeout(request.timer)
  if (browser.exitCode === null) browser.kill()
  // Perfil temporário isolado permanece em TEMP; o perfil pessoal não é utilizado.
}
