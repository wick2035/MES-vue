/**
 * 全局统一的 motion-v 动效参数，跨页面保持一致的弹簧手感与逐项入场节奏。
 */
export const SPRING = { type: 'spring', stiffness: 380, damping: 30, mass: 0.8 } as const
export const SPRING_SOFT = { type: 'spring', stiffness: 240, damping: 26 } as const

/** 逐项入场延迟（秒），带上限避免长列表尾部等待过久 */
export function staggerDelay(index: number, step = 0.04, max = 0.4): number {
  return Math.min(index * step, max)
}
