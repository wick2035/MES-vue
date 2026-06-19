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
try { fs.unlinkSync(CODE_FILE) } catch {}

const consoleErrors = []
const pageErrors = []
const failed = []
const steps = []
const log = (s) => { console.log(s); steps.push(s) }

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
page.on('pageerror', (e) => pageErrors.push(e.message))
page.on('requestfailed', (r) => failed.push(`${r.url()} :: ${r.failure()?.errorText}`))

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
await page.waitForSelector('#captcha')
await page.locator('img[alt="验证码"]').screenshot({ path: CAPTCHA_PNG })
log(`captcha screenshot -> ${CAPTCHA_PNG}`)

let code = null
for (let i = 0; i < 90; i++) {
  if (fs.existsSync(CODE_FILE)) { code = fs.readFileSync(CODE_FILE, 'utf8').trim(); break }
  await page.waitForTimeout(1000)
}
if (!code) { log('NO CAPTCHA CODE PROVIDED — abort'); await browser.close(); process.exit(2) }
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
await page.screenshot({ path: path.join(OUT, '01-dashboard.png'), fullPage: true })

async function visit(name, url, waitSel) {
  try {
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' })
    if (waitSel) await page.waitForSelector(waitSel, { timeout: 10000 })
    await page.waitForTimeout(700)
    const rows = await page.locator('tbody tr').count().catch(() => 0)
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true })
    log(`visit ${url} OK (rows=${rows})`)
  } catch (e) {
    log(`visit ${url} FAIL: ${e.message}`)
    await page.screenshot({ path: path.join(OUT, `${name}-FAIL.png`), fullPage: true }).catch(() => {})
  }
}

await visit('02-material', '/basedata/material', 'table')
await visit('03-equipment', '/basedata/equipment', 'table')
await visit('04-inventory', '/basedata/inventory', 'table')
await visit('05-plan', '/production/plan', 'table')
await visit('06-orders', '/production/order', 'table')

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

fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ steps, consoleErrors, pageErrors, failed }, null, 2))
console.log('\n===== SUMMARY =====')
console.log('console errors:', consoleErrors.length)
consoleErrors.slice(0, 25).forEach((e) => console.log('  CE:', e))
console.log('page errors:', pageErrors.length)
pageErrors.slice(0, 25).forEach((e) => console.log('  PE:', e))
console.log('failed requests:', failed.length)
failed.slice(0, 25).forEach((e) => console.log('  RF:', e))
console.log('screenshots in', OUT)
await browser.close()
