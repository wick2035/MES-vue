import { chromium } from 'playwright'

const baseUrl = process.env.COMBOBOX_BASE || 'http://127.0.0.1:5174/'

const browser = await chromium.launch({ headless: true })

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', (message) => console.log(`browser console ${message.type()}: ${message.text()}`))
  page.on('pageerror', (error) => console.log(`browser pageerror: ${error.message}`))
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })

  await page.evaluate(async () => {
    const host = document.createElement('div')
    host.id = 'combobox-test-host'
    host.style.cssText =
      'position: fixed; left: 64px; top: 64px; width: 420px; z-index: 2000; background: white; padding: 32px;'
    document.body.appendChild(host)

    const [{ createApp, h, ref }, { default: SpCombobox }] = await Promise.all([
      import('/node_modules/.vite/deps/vue.js'),
      import('/src/components/ui/combobox/SpCombobox.vue'),
    ])

    createApp({
      components: { SpCombobox },
      setup() {
        const picked = ref([])
        const options = [
          { value: 'u1', label: '张三', description: '装配班' },
          { value: 'u2', label: '李四', description: '测试班' },
        ]
        return { picked, options }
      },
      render() {
        return h(SpCombobox, {
          modelValue: this.picked,
          'onUpdate:modelValue': (value) => {
            this.picked = value
          },
          options: this.options,
          multiple: true,
          placeholder: '选择员工（可多选）',
          searchPlaceholder: '搜索员工姓名',
          class: 'w-full',
        })
      },
    }).mount(host)
  })

  await page.locator('#combobox-test-host [role="combobox"]').click()
  await page.waitForTimeout(300)

  const result = await page.evaluate(() => {
    const trigger = document.querySelector('#combobox-test-host [role="combobox"]')
    const items = Array.from(document.querySelectorAll('[role="option"]'))
    const first = items[0]
    const rect = first?.getBoundingClientRect()
    const hit = rect
      ? document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
      : null
    const hitOption = hit?.closest?.('[role="option"]')
    const wrapper = first?.closest('[data-reka-popper-content-wrapper]')
    const content = wrapper?.firstElementChild
    return {
      itemCount: items.length,
      firstText: first?.textContent?.trim() || '',
      hitRole: hit?.getAttribute('role') || '',
      hitText: hit?.textContent?.trim() || '',
      hitOptionText: hitOption?.textContent?.trim() || '',
      triggerHeight: Math.round(trigger?.getBoundingClientRect().height || 0),
      contentPaddingTop: content ? getComputedStyle(content).paddingTop : '',
      itemHeight: Math.round(rect?.height || 0),
      wrapperZ: wrapper ? getComputedStyle(wrapper).zIndex : '',
      wrapperVisible: wrapper ? getComputedStyle(wrapper).visibility : '',
      wrapperPointer: wrapper ? getComputedStyle(wrapper).pointerEvents : '',
    }
  })

  console.log(JSON.stringify(result))

  if (
    result.itemCount < 2 ||
    !result.firstText.includes('张三') ||
    !result.hitOptionText.includes('张三') ||
    result.triggerHeight !== 36 ||
    result.contentPaddingTop !== '4px' ||
    result.itemHeight < 44 ||
    result.wrapperZ !== '1000' ||
    result.wrapperVisible === 'hidden' ||
    result.wrapperPointer === 'none'
  ) {
    throw new Error('SpCombobox popover is not visible/selectable')
  }

  await page.locator('[role="option"]').first().click()
  const pickedText = await page.locator('#combobox-test-host [role="combobox"]').textContent()
  if (!pickedText?.includes('张三')) {
    throw new Error('SpCombobox option click did not update selected value')
  }
} finally {
  await browser.close()
}
