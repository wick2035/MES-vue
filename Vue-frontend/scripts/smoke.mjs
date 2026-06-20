// 端到端冒烟测试：登录(验证码由人工读图回填) → 遍历核心页面 → 采集控制台/页面错误与截图。
// 用法：node scripts/smoke.mjs ；脚本会把验证码图片存到 %TEMP%\captcha.png，
// 等待 %TEMP%\captcha-code.txt 出现后用其内容登录。
import { chromium } from 'playwright'
import fs from 'fs'
import os from 'os'
import path from 'path'

const BASE = process.env.SMOKE_BASE || 'http://localhost:5173'
const TMP = os.tmpdir()
const OUT = path.join(TMP, 'mes-smoke')
fs.mkdirSync(OUT, { recursive: true })
const CAPTCHA_PNG = path.join(TMP, 'captcha.png')
const CODE_FILE = path.join(TMP, 'captcha-code.txt')
try {
  fs.unlinkSync(CODE_FILE)
} catch {}

const consoleErrors = []
const pageErrors = []
const failed = []
const steps = []
const log = (s) => {
  console.log(s)
  steps.push(s)
}

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text())
})
page.on('pageerror', (e) => pageErrors.push(e.message))
page.on('requestfailed', (r) => {
  const url = r.url()
  const err = r.failure()?.errorText || ''
  // SSE 流在收到最终回答后会被前端主动关闭以阻止 EventSource 自动重连，
  // 这会产生一次预期内的 ERR_ABORTED，属正常清理，不计入失败
  if (url.includes('/llm/chat/stream') && err.includes('ERR_ABORTED')) return
  failed.push(`${url} :: ${err}`)
})

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
await page.waitForSelector('#captcha')
await page.locator('img[alt="验证码"]').screenshot({ path: CAPTCHA_PNG })
log(`captcha screenshot -> ${CAPTCHA_PNG}`)

let code = null
for (let i = 0; i < 90; i++) {
  if (fs.existsSync(CODE_FILE)) {
    code = fs.readFileSync(CODE_FILE, 'utf8').trim()
    break
  }
  await page.waitForTimeout(1000)
}
if (!code) {
  log('NO CAPTCHA CODE PROVIDED — abort')
  await browser.close()
  process.exit(2)
}
log(`captcha code: ${code}`)

await page.fill('#username', 'admin')
await page.fill('#password', '123')
await page.fill('#captcha', code)
await page.click('button[type=submit]')
try {
  await page.waitForURL('**/dashboard', { timeout: 10000 })
  log('LOGIN OK -> /dashboard')
} catch {
  log(`LOGIN FAILED (url=${page.url()})`)
}
// 等待看板图表渲染（ECharts canvas）
try {
  await page.waitForSelector('canvas', { timeout: 10000 })
  await page.waitForTimeout(1500)
  const charts = await page.locator('canvas').count()
  log(`dashboard charts rendered: ${charts}`)
} catch {
  log('dashboard charts NOT rendered')
}
await page.screenshot({ path: path.join(OUT, '01-dashboard.png'), fullPage: true })

async function visit(name, url, waitSel) {
  try {
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' })
    if (waitSel) await page.waitForSelector(waitSel, { timeout: 10000 })
    await page.waitForTimeout(700)
    const rows = await page
      .locator('tbody tr')
      .count()
      .catch(() => 0)
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true })
    log(`visit ${url} OK (rows=${rows})`)
  } catch (e) {
    log(`visit ${url} FAIL: ${e.message}`)
    await page
      .screenshot({ path: path.join(OUT, `${name}-FAIL.png`), fullPage: true })
      .catch(() => {})
  }
}

await visit('02-material', '/basedata/material', 'table')
await visit('03-equipment', '/basedata/equipment', 'table')
await visit('04-inventory', '/basedata/inventory', 'table')
await visit('05-plan', '/production/plan', 'table')
await visit('06-orders', '/production/order', 'table')
await visit('06a-material-plan', '/production/material-plan', 'table')
await visit('06b-equipment-dispatch', '/production/equipment-dispatch', 'table')
await visit('06c-employee-dispatch', '/production/employee-dispatch', 'table')
await visit('06d-production-dispatch', '/production/dispatch', 'table')
await visit('10-bom', '/technology/bom', 'table')
await visit('11-oper', '/technology/oper', 'table')
await visit('12-flow', '/technology/flow', 'table')
await visit('14-sn-records', '/wip/records', 'table')
await visit('16-users', '/system/user', 'table')
await visit('17-roles', '/system/role', 'table')
await visit('18-menus', '/system/menu', 'main')
await visit('19-depts', '/system/dept', 'main')

// SN 追溯（取第一条记录的 SN）
try {
  await page.goto(`${BASE}/wip/records`, { waitUntil: 'networkidle' })
  await page.waitForSelector('tbody tr', { timeout: 10000 })
  await page.locator('tbody tr').first().getByTitle('SN 追溯').click()
  await page.waitForURL('**/wip/trace/*', { timeout: 10000 })
  await page.waitForTimeout(900)
  await page.screenshot({ path: path.join(OUT, '15-sn-trace.png'), fullPage: true })
  log(`sn trace OK (${page.url()})`)
} catch (e) {
  log(`sn trace FAIL: ${e.message}`)
}

// BOM 详情
try {
  await page.goto(`${BASE}/technology/bom`, { waitUntil: 'networkidle' })
  await page.waitForSelector('tbody tr', { timeout: 10000 })
  await page.locator('tbody tr').first().getByTitle('查看结构').click()
  await page.waitForURL('**/technology/bom/*', { timeout: 10000 })
  await page.waitForTimeout(900)
  await page.screenshot({ path: path.join(OUT, '13-bom-detail.png'), fullPage: true })
  log(`bom detail OK (${page.url()})`)
} catch (e) {
  log(`bom detail FAIL: ${e.message}`)
}

// 工单详情
try {
  await page.goto(`${BASE}/production/order`, { waitUntil: 'networkidle' })
  await page.waitForSelector('tbody tr', { timeout: 10000 })
  await page.locator('tbody tr').first().getByTitle('查看详情').click()
  await page.waitForURL('**/production/order/*', { timeout: 10000 })
  await page.waitForTimeout(900)
  await page.screenshot({ path: path.join(OUT, '07-order-detail.png'), fullPage: true })
  log(`order detail OK (${page.url()})`)
} catch (e) {
  log(`order detail FAIL: ${e.message}`)
}

// 命令面板
try {
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  await page.keyboard.press('Control+k')
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(OUT, '08-command.png') })
  await page.keyboard.press('Escape')
  log('command palette opened')
} catch (e) {
  log(`command palette FAIL: ${e.message}`)
}

// 主题切换
try {
  await page.locator('button[title="切换主题"]').click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(OUT, '09-dark.png'), fullPage: true })
  log('theme toggled')
} catch (e) {
  log(`theme toggle FAIL: ${e.message}`)
}

// M9 实时通知中心：连接后即收到“连接成功”系统消息，铃铛出现未读角标；打开面板查看
try {
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  await page.waitForSelector('button[title^="通知中心"]', { timeout: 8000 })
  // 等待 WebSocket 建连 + 至少一轮广播（initialDelay 8s + fixedDelay 12s）
  await page.waitForTimeout(11000)
  const online = (await page.locator('button[title="通知中心（实时在线）"]').count()) > 0
  // 关闭可能遮挡铃铛的 toast（与铃铛同处右上角），避免拦截点击
  await page.evaluate(() =>
    document.querySelectorAll('[data-sonner-toast]').forEach((t) => t.remove()),
  )
  await page.locator('button[title^="通知中心"]').click({ force: true })
  await page.waitForTimeout(800)
  const realtimeChip = await page.getByText('实时', { exact: true }).count()
  const notifyItems = await page.locator('p.line-clamp-2').count()
  await page.screenshot({ path: path.join(OUT, '20-notify.png') })
  log(`notify center: online=${online} realtimeChip=${realtimeChip} items=${notifyItems}`)
  await page.keyboard.press('Escape')
} catch (e) {
  log(`notify center FAIL: ${e.message}`)
}

// M10 AI 助手：SSE 流式对话（接真实 DashScope）
try {
  await page.goto(`${BASE}/assistant`, { waitUntil: 'networkidle' })
  await page.waitForSelector('textarea', { timeout: 8000 })
  await page.fill('textarea', '查询库存低于安全库存的物料')
  await page.keyboard.press('Enter')
  // 等待助手气泡出现非空 Markdown 内容（流式增量）；两轮 LLM 调用较慢，给足 90s
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll('.md-body')).some(
        (b) => (b.textContent || '').trim().length > 0,
      ),
    undefined,
    { timeout: 90000 },
  )
  await page.waitForTimeout(2500)
  const answer = (await page.locator('.md-body').last().textContent()) || ''
  await page.screenshot({ path: path.join(OUT, '21-assistant.png'), fullPage: true })
  // 等待流式结束（停止按钮消失），避免离开页面时中断 SSE 连接
  await page
    .waitForSelector('button[title="停止生成"]', { state: 'detached', timeout: 60000 })
    .catch(() => {})
  log(
    `assistant answered (${answer.trim().length} chars): ${answer.slice(0, 50).replace(/\s+/g, ' ')}`,
  )
} catch (e) {
  log(`assistant FAIL: ${e.message}`)
  await page
    .screenshot({ path: path.join(OUT, '21-assistant-FAIL.png'), fullPage: true })
    .catch(() => {})
}

// M11 数字孪生 3D 产线
try {
  await page.goto(`${BASE}/twin`, { waitUntil: 'networkidle' })
  await page.waitForSelector('canvas', { timeout: 8000 })
  // 等待数据加载与首帧渲染
  await page.waitForSelector('text=工位状态', { timeout: 12000 })
  await page.waitForTimeout(3000)
  const panel = await page.getByText('智能产线数字孪生').count()
  const running = await page
    .getByText('运行中')
    .count()
    .catch(() => 0)
  await page.screenshot({ path: path.join(OUT, '22-twin.png'), fullPage: true })
  log(`digital twin rendered (title=${panel}, runningTags=${running})`)
} catch (e) {
  log(`twin FAIL: ${e.message}`)
  await page
    .screenshot({ path: path.join(OUT, '22-twin-FAIL.png'), fullPage: true })
    .catch(() => {})
}

// M11B 数字孪生 3D 库房：真实高位货架仓储场景
try {
  await page.goto(`${BASE}/twin/warehouse`, { waitUntil: 'networkidle' })
  await page.waitForSelector('canvas', { timeout: 8000 })
  await page.waitForSelector('text=仓储控制台', { timeout: 12000 })
  await page.waitForSelector('text=总览', { timeout: 5000 })
  await page.waitForSelector('text=装卸区', { timeout: 5000 })
  await page.waitForSelector('text=巷道', { timeout: 5000 })
  await page.waitForTimeout(2500)
  const canvasPixels = await page.locator('canvas').evaluate((canvas) => {
    const c = canvas
    const sample = document.createElement('canvas')
    sample.width = 12
    sample.height = 12
    const ctx = sample.getContext('2d')
    ctx.drawImage(c, 0, 0, 12, 12)
    return Array.from(ctx.getImageData(0, 0, 12, 12).data).some((v) => v !== 0)
  })
  await page.screenshot({ path: path.join(OUT, '23-warehouse-twin.png'), fullPage: true })
  log(`warehouse twin rendered (canvasPixels=${canvasPixels})`)
} catch (e) {
  log(`warehouse twin FAIL: ${e.message}`)
  await page
    .screenshot({ path: path.join(OUT, '23-warehouse-twin-FAIL.png'), fullPage: true })
    .catch(() => {})
}

fs.writeFileSync(
  path.join(OUT, 'result.json'),
  JSON.stringify({ steps, consoleErrors, pageErrors, failed }, null, 2),
)
console.log('\n===== SUMMARY =====')
console.log('console errors:', consoleErrors.length)
consoleErrors.slice(0, 25).forEach((e) => console.log('  CE:', e))
console.log('page errors:', pageErrors.length)
pageErrors.slice(0, 25).forEach((e) => console.log('  PE:', e))
console.log('failed requests:', failed.length)
failed.slice(0, 25).forEach((e) => console.log('  RF:', e))
console.log('screenshots in', OUT)
await browser.close()
