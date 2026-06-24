import { onActivated, onBeforeUnmount, onDeactivated, onMounted } from 'vue'

/**
 * 页面数据自动刷新：
 * - 进入页面（含 keep-alive 缓存命中重新激活）立即加载一次；
 * - 停留期间每 intervalMs 轮询一次；
 * - 离开（失活/卸载）时清除定时器，避免后台空跑。
 *
 * 用法：替换原本的 `onMounted(load)`，改为 `useAutoRefresh(load)`。
 * 多个加载函数可包一层：`useAutoRefresh(() => Promise.all([a(), b()]))`。
 */
export function useAutoRefresh(
  refresh: () => unknown | Promise<unknown>,
  intervalMs = 30000,
) {
  let timer: ReturnType<typeof setInterval> | null = null
  let firstActivated = true

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }
  function start() {
    stop()
    if (intervalMs > 0) {
      timer = setInterval(() => {
        void refresh()
      }, intervalMs)
    }
  }

  onMounted(() => {
    void refresh()
    start()
  })
  onActivated(() => {
    // keep-alive 组件首次挂载时 onMounted 与 onActivated 接连触发，跳过首次以免重复加载
    if (firstActivated) {
      firstActivated = false
      return
    }
    void refresh()
    start()
  })
  onDeactivated(stop)
  onBeforeUnmount(stop)
}
