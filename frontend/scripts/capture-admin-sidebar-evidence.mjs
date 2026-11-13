// Capturas locais com Edge/Chromium instalado; nenhuma biblioteca adicional.
// Uso: node scripts/capture-admin-sidebar-evidence.mjs [caminho-do-browser]
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

const executable = process.argv[2] ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const baseUrl = 'http://localhost:5174'
const output = fileURLToPath(new URL('../docs/etapas/evidencias/03.5A/', import.meta.url))
await fetch(baseUrl)
const profile = await mkdtemp(join(tmpdir(), 'maragobus-03.5A-'))
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
    { name: 'desktop', width: 1440, height: 1000, mobile: false, path: '/', title: 'Painel administrativo' },
    { name: 'desktop-menor', width: 1024, height: 768, mobile: false, path: '/cursos-ofertados', title: 'Cursos ofertados' },
    { name: 'mobile', width: 390, height: 844, mobile: true, path: '/pontos-embarque', title: 'Pontos de embarque' },
    { name: 'desktop-baixo', width: 1024, height: 420, mobile: false, path: '/perfil', title: 'Perfil', short: true },
  ]) {
    await call('Emulation.setDeviceMetricsOverride', {
      width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile,
    })
    await call('Emulation.setTouchEmulationEnabled', { enabled: viewport.mobile })
    await call('Page.navigate', { url: baseUrl + viewport.path })
    let ready = false
    for (let attempt = 0; attempt < 150; attempt++) {
      ready = await evaluate('location.pathname === ' + JSON.stringify(viewport.path) +
        ' && document.querySelector("main h1")?.textContent === ' + JSON.stringify(viewport.title))
      if (ready) break
      await delay(100)
    }
    if (!ready) throw new Error('Página não renderizou: ' + viewport.path)
    await evaluate('document.fonts.ready.then(() => true)')
    const keyboardTrail = []
    if (viewport.short) {
      await call('Page.bringToFront')
      for (let index = 0; index < 10; index++) {
        await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
        await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
        keyboardTrail.push(await evaluate('document.activeElement?.textContent.trim()'))
      }
      await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
      await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
    }
    const measurement = await evaluate(`(() => {
      const rect = element => {
        const { x, y, width, height, bottom, right } = element.getBoundingClientRect()
        return { x, y, width, height, bottom, right }
      }
      const nav = document.querySelector('nav')
      const last = nav.querySelector('li:last-child a')
      return {
        path: location.pathname, title: document.querySelector('main h1').textContent,
        viewport: { width: innerWidth, height: innerHeight },
        horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth,
        visibleNavigations: [...document.querySelectorAll('nav')].filter(element => element.getClientRects().length > 0).length,
        links: [...nav.querySelectorAll('a')].map(link => link.textContent.trim()),
        active: nav.querySelector('a[aria-current="page"]')?.getAttribute('href'),
        header: rect(document.querySelector('header')), main: rect(document.querySelector('main')),
        card: rect(document.querySelector('.mb-card')), sidebar: rect(nav),
        scroll: { top: nav.scrollTop, height: nav.clientHeight, content: nav.scrollHeight, overflowY: getComputedStyle(nav).overflowY },
        lastLink: rect(last), mainCount: document.querySelectorAll('main').length,
        focus: document.activeElement?.textContent.trim(),
        focusOutline: getComputedStyle(document.activeElement).outlineStyle,
      }
    })()`)
    const screenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    const filename = 'admin-' + viewport.name + '.png'
    await writeFile(join(output, filename), Buffer.from(screenshot.data, 'base64'))
    const valid = measurement.viewport.width === viewport.width &&
      !measurement.horizontalOverflow && measurement.mainCount === 1 &&
      measurement.links.length === 9 && measurement.active === viewport.path &&
      measurement.visibleNavigations === (viewport.mobile ? 0 : 1) &&
      measurement.header.bottom <= measurement.main.y + 1 &&
      (viewport.mobile || (
        measurement.sidebar.width === 256 &&
        measurement.sidebar.right <= measurement.main.x + 1 &&
        measurement.sidebar.bottom <= viewport.height + 1 &&
        measurement.sidebar.y >= measurement.header.bottom - 1
      )) &&
      (!viewport.short || (
        measurement.scroll.content > measurement.scroll.height &&
        measurement.scroll.top > 0 && measurement.scroll.overflowY === 'auto' &&
        measurement.lastLink.bottom <= measurement.sidebar.bottom + 1 &&
        keyboardTrail[0] === 'Ir para o conteúdo principal' && keyboardTrail[9] === 'Perfil' &&
        measurement.focus === 'Perfil' && measurement.focusOutline !== 'none'
      ))
    metrics.pages.push({ filename, valid, keyboardTrail, ...measurement })
    await writeFile(join(output, 'metrics.json'), JSON.stringify(metrics, null, 2) + '\n')
    console.log(filename + ': ' + (valid ? 'OK' : 'FALHOU'))
    if (!valid) throw new Error('Falha de geometria/teclado: ' + JSON.stringify(measurement) + JSON.stringify(keyboardTrail))
  }
} finally {
  try { if (socket?.readyState === WebSocket.OPEN) await call('Browser.close') } catch {}
  socket?.close()
  for (const request of pending.values()) clearTimeout(request.timer)
  if (browser.exitCode === null) browser.kill()
  // Perfil temporário isolado permanece em TEMP; o perfil pessoal não é utilizado.
}


