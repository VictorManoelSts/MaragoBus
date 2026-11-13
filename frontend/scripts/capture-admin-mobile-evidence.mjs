// Capturas locais com Edge/Chromium instalado; nenhuma biblioteca adicional.
// Uso: node scripts/capture-admin-mobile-evidence.mjs [caminho-do-browser]
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

const executable = process.argv[2] ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const baseUrl = 'http://localhost:5174'
const output = fileURLToPath(new URL('../docs/etapas/evidencias/03.5B/', import.meta.url))
await fetch(baseUrl)
const profile = await mkdtemp(join(tmpdir(), 'maragobus-03.5B-'))
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

  async function waitFor(expression) {
    for (let attempt = 0; attempt < 120; attempt++) {
      if (await evaluate(expression)) return
      await delay(50)
    }
    throw new Error('Condição não satisfeita: ' + expression)
  }
  async function frames() {
    await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
  }
  async function clickPoint(x, y) {
    await call('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
    await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
    await frames()
  }
  async function click(selector) {
    const point = await evaluate('(() => { const element = document.querySelector(' + JSON.stringify(selector) +
      '); element.scrollIntoView({block:"nearest"}); const r = element.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()')
    await clickPoint(point.x, point.y)
  }
  async function key(key, code, value, modifiers = 0) {
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: value, modifiers })
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: value, modifiers })
    await frames()
  }
  function check(name, valid) {
    metrics.behaviours ??= []
    metrics.behaviours.push({ name, valid })
    if (!valid) throw new Error('Comportamento falhou: ' + name)
  }
  async function capture(filename, viewport, opened) {
    await frames()
    const measurement = await evaluate(`(() => {
      const rect = element => {
        const {x,y,width,height,right,bottom} = element.getBoundingClientRect()
        return {x,y,width,height,right,bottom}
      }
      const drawer = document.querySelector('.admin-drawer')
      const trigger = document.querySelector('[aria-label="Abrir menu"]')
      const visible = element => element.getClientRects().length > 0
      const nav = drawer.open ? drawer.querySelector('nav') : document.querySelector('nav')
      const last = drawer.querySelector('li:last-child a')
      const focus = document.activeElement
      return {
        path: location.pathname, viewport: {width:innerWidth,height:innerHeight},
        opened: drawer.open, expanded: trigger.getAttribute('aria-expanded'),
        controlsMatch: trigger.getAttribute('aria-controls') === drawer.id,
        horizontalOverflow: Math.max(document.documentElement.scrollWidth,document.body.scrollWidth) > innerWidth,
        visibleNavigations: [...document.querySelectorAll('nav')].filter(visible).length,
        triggerVisible: visible(trigger), trigger: rect(trigger),
        logo: rect(document.querySelector('header img')), header: rect(document.querySelector('header')),
        main: rect(document.querySelector('main')), card: rect(document.querySelector('.mb-card')),
        drawer: rect(drawer), links: nav.querySelectorAll('a').length,
        active: nav.querySelector('a[aria-current="page"]')?.getAttribute('href'),
        bodyOverflow: document.body.style.overflow, htmlOverflow: document.documentElement.style.overflow,
        focused: focus?.getAttribute('aria-label') || focus?.getAttribute('href') || focus?.id || focus?.tagName,
        focusInside: drawer.contains(focus), focusOutline: getComputedStyle(focus).outlineStyle,
        scroll: {top:nav.scrollTop,height:nav.clientHeight,content:nav.scrollHeight},
        lastLink: rect(last),
      }
    })()`)
    const screenshot = await call('Page.captureScreenshot', {format:'png',captureBeyondViewport:false})
    await writeFile(join(output,filename),Buffer.from(screenshot.data,'base64'))
    const expectedNavs = opened || viewport.width >= 1024 ? 1 : 0
    const valid = measurement.viewport.width === viewport.width && measurement.opened === opened &&
      !measurement.horizontalOverflow && measurement.controlsMatch &&
      measurement.expanded === String(opened) && measurement.links === 9 &&
      measurement.visibleNavigations === expectedNavs &&
      measurement.triggerVisible === (viewport.width < 1024) &&
      (opened ? (
        measurement.drawer.x === 0 && measurement.drawer.width <= viewport.width - 32 &&
        measurement.drawer.height <= viewport.height && measurement.focusInside &&
        measurement.bodyOverflow === 'hidden' && measurement.htmlOverflow === 'hidden'
      ) : (
        measurement.main.y >= measurement.header.bottom - 1 &&
        measurement.bodyOverflow !== 'hidden' && measurement.htmlOverflow !== 'hidden' &&
        (!measurement.triggerVisible || Math.abs(measurement.trigger.y + measurement.trigger.height/2 -
          measurement.logo.y - measurement.logo.height/2) < 1)
      ))
    metrics.pages.push({filename,valid,...measurement})
    await writeFile(join(output,'metrics.json'),JSON.stringify(metrics,null,2)+'\n')
    console.log(filename+': '+(valid?'OK':'FALHOU'))
    if (!valid) throw new Error('Geometria falhou: '+JSON.stringify(measurement))
    return measurement
  }

  for (const viewport of [
    {name:'mobile',width:390,height:844,mobile:true},
    {name:'tablet',width:768,height:1024,mobile:true},
    {name:'desktop-menor',width:1024,height:768,mobile:false},
    {name:'desktop',width:1440,height:1000,mobile:false},
    {name:'mobile-baixo',width:390,height:420,mobile:true},
  ]) {
    await call('Emulation.setDeviceMetricsOverride', {
      width:viewport.width,height:viewport.height,deviceScaleFactor:1,mobile:viewport.mobile,
    })
    await call('Emulation.setTouchEmulationEnabled', {enabled:viewport.mobile})
    await call('Page.navigate',{url:baseUrl+'/cursos-ofertados'})
    await waitFor('document.querySelector("main h1")?.textContent === "Cursos ofertados"')
    await evaluate('document.fonts.ready.then(()=>true)')
    await capture('admin-'+viewport.name+'-fechado.png',viewport,false)
    if (!viewport.mobile) continue
    await click('[aria-label="Abrir menu"]')
    await waitFor('document.querySelector(".admin-drawer").open')
    check(viewport.name+' foco inicial',await evaluate('document.activeElement?.getAttribute("aria-label")==="Fechar menu"'))
    await evaluate('document.querySelector("main").focus()')
    check(viewport.name+' fundo inerte',await evaluate('document.querySelector(".admin-drawer").contains(document.activeElement)'))
    if (viewport.name === 'mobile-baixo') {
      const before = await evaluate('window.scrollY')
      await call('Input.dispatchMouseEvent',{type:'mouseWheel',x:380,y:200,deltaX:0,deltaY:300})
      await frames()
      check('fundo sem rolagem por wheel',before === await evaluate('window.scrollY'))
      await key('Tab','Tab',9,8)
      check('Shift+Tab chega a Perfil',await evaluate('document.activeElement?.getAttribute("href")==="/perfil"'))
      const scroll = await evaluate('(() => { const n=document.querySelector(".admin-drawer nav"); const a=n.querySelector("li:last-child a").getBoundingClientRect();return {overflow:n.scrollHeight>n.clientHeight,top:n.scrollTop,bottom:a.bottom,limit:n.getBoundingClientRect().bottom}; })()')
      check('rolagem interna e último destino acessível',scroll.overflow && scroll.top>0 && scroll.bottom<=scroll.limit+1)
    }
    await capture('admin-'+viewport.name+'-aberto.png',viewport,true)
    await key('Tab','Tab',9)
    check(viewport.name+' Tab permanece no drawer',await evaluate('document.querySelector(".admin-drawer").contains(document.activeElement)'))
    await key('Escape','Escape',27)
    await waitFor('!document.querySelector(".admin-drawer").open')
    check(viewport.name+' Escape restaura foco',await evaluate('document.activeElement?.getAttribute("aria-label")==="Abrir menu"'))
    check(viewport.name+' Escape libera scroll',await evaluate('document.body.style.overflow==="" && document.documentElement.style.overflow===""'))
    if (viewport.name === 'mobile') {
      await click('[aria-label="Abrir menu"]')
      await clickPoint(380,300)
      await waitFor('!document.querySelector(".admin-drawer").open')
      check('backdrop restaura foco',await evaluate('document.activeElement?.getAttribute("aria-label")==="Abrir menu"'))
      await click('[aria-label="Abrir menu"]')
      await click('[aria-label="Fechar menu"]')
      await waitFor('!document.querySelector(".admin-drawer").open')
      check('botão Fechar menu restaura foco',await evaluate('document.activeElement?.getAttribute("aria-label")==="Abrir menu"'))
      await click('[aria-label="Abrir menu"]')
      await click('.admin-drawer a[href="/alunos"]')
      await waitFor('location.pathname==="/alunos" && !document.querySelector(".admin-drawer").open')
      check('navegação fecha drawer e focaliza conteúdo',await evaluate('document.activeElement?.id==="admin-content"'))
      await capture('admin-mobile-apos-navegar.png',viewport,false)
      await click('[aria-label="Abrir menu"]')
      await click('.admin-drawer a[href="/alunos"]')
      await waitFor('!document.querySelector(".admin-drawer").open')
      check('seleção da página atual fecha o drawer',true)
    }
    if (viewport.name === 'tablet') {
      await click('[aria-label="Abrir menu"]')
      await call('Emulation.setDeviceMetricsOverride',{width:1024,height:768,deviceScaleFactor:1,mobile:false})
      await waitFor('!document.querySelector(".admin-drawer").open')
      check('breakpoint fecha e libera foco/scroll',await evaluate('document.activeElement?.id==="admin-content" && document.body.style.overflow==="" && document.documentElement.style.overflow===""'))
      await capture('admin-apos-breakpoint.png',{width:1024,height:768},false)
    }
  }
  await writeFile(join(output,'metrics.json'),JSON.stringify(metrics,null,2)+'\n')
} finally {
  try { if (socket?.readyState === WebSocket.OPEN) await call('Browser.close') } catch {}
  socket?.close()
  for (const request of pending.values()) clearTimeout(request.timer)
  if (browser.exitCode === null) browser.kill()
  // Perfil temporário isolado permanece em TEMP; o perfil pessoal não é utilizado.
}


