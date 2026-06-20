import { chromium } from 'playwright'

const baseUrl = process.env.DIALOG_LAYERING_BASE || 'http://127.0.0.1:5175/'

const browser = await chromium.launch({ headless: true })

try {
  const page = await browser.newPage({ viewport: { width: 1380, height: 768 } })
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })

  const result = await page.evaluate(() => {
    const root = document.createElement('div')
    root.innerHTML = `
      <div id="dialog-layering-overlay" class="fixed inset-0 z-[100] bg-black/80"></div>
      <div id="dialog-layering-dialog" class="fixed left-1/2 top-1/2 z-[110] pointer-events-auto grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg">
        <p>确认订单</p>
        <button id="dialog-layering-cancel" class="h-10 px-4 py-2 border bg-background">取消</button>
        <button id="dialog-layering-ok" class="h-10 px-4 py-2 bg-destructive text-destructive-foreground">确定</button>
      </div>
      <div id="dialog-layering-calendar" class="fixed z-[1000] h-24 w-48 bg-white p-3" style="left: calc(50% - 96px); top: calc(50% - 180px); z-index: 1000;">日期面板</div>
    `
    document.body.appendChild(root)

    const button = document.getElementById('dialog-layering-ok')
    const overlay = document.getElementById('dialog-layering-overlay')
    const dialog = document.getElementById('dialog-layering-dialog')
    const calendar = document.getElementById('dialog-layering-calendar')
    const rect = button.getBoundingClientRect()
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    const calendarRect = calendar.getBoundingClientRect()
    const calendarHit = document.elementFromPoint(
      calendarRect.left + calendarRect.width / 2,
      calendarRect.top + calendarRect.height / 2,
    )

    return {
      hitId: hit?.id || '',
      hitTag: hit?.tagName || '',
      calendarHitId: calendarHit?.id || '',
      overlayZ: getComputedStyle(overlay).zIndex,
      dialogZ: getComputedStyle(dialog).zIndex,
      calendarZ: getComputedStyle(calendar).zIndex,
      dialogPointer: getComputedStyle(dialog).pointerEvents,
    }
  })

  console.log(JSON.stringify(result))

  if (
    result.hitId !== 'dialog-layering-ok' ||
    result.calendarHitId !== 'dialog-layering-calendar' ||
    result.overlayZ !== '100' ||
    result.dialogZ !== '110' ||
    result.calendarZ !== '1000' ||
    result.dialogPointer !== 'auto'
  ) {
    throw new Error('dialog content is still not reliably above the overlay')
  }
} finally {
  await browser.close()
}
