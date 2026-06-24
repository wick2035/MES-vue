import { onBeforeUnmount, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'

/**
 * 数字滚动计数：从当前值缓动到目标值（easeOutCubic），用于 KPI 等大数字的入场。
 * - `prefers-reduced-motion: reduce` 时直接取终值，不做动画；
 * - 仅首次挂载与「数值真正变化」时滚动；keep-alive 切回页面不重播（值未变即不触发）；
 * - 卸载时取消 rAF。
 *
 * 返回一个 `ref<number>`，格式化（千分位/小数位）交给消费处的模板绑定，避免在每帧里做。
 */
export function useCountUp(source: MaybeRefOrGetter<number>, opts?: { duration?: number }) {
  const reduce = usePreferredReducedMotion()
  const display = ref(0)
  let raf = 0

  function run(to: number) {
    cancelAnimationFrame(raf)
    if (reduce.value === 'reduce') {
      display.value = to
      return
    }
    const from = display.value
    const t0 = performance.now()
    const dur = opts?.duration ?? 800
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      display.value = from + (to - from) * eased
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
  }

  watch(() => toValue(source), (v) => run(v ?? 0), { immediate: true })
  onBeforeUnmount(() => cancelAnimationFrame(raf))

  return display
}
