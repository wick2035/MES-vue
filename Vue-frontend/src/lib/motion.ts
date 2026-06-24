/**
 * 全局统一的 motion-v 动效参数，跨页面保持一致的弹簧手感与逐项入场节奏。
 */
export const SPRING = { type: 'spring', stiffness: 380, damping: 30, mass: 0.8 } as const
export const SPRING_SOFT = { type: 'spring', stiffness: 240, damping: 26 } as const

/** 逐项入场延迟（秒），带上限避免长列表尾部等待过久 */
export function staggerDelay(index: number, step = 0.04, max = 0.4): number {
  return Math.min(index * step, max)
}

/** 通用「淡入 + 轻微上移」入场，配合 SPRING_SOFT 使用 */
export const pageEnter = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: SPRING_SOFT,
} as const

/** reduced-motion 守卫语法糖：偏好减少动效时返回 false（关闭该动画），否则原值。 */
export function withReduce<T>(reduce: string | undefined, value: T): T | false {
  return reduce === 'reduce' ? false : value
}
