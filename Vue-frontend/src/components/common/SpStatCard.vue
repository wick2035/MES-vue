<script setup lang="ts">
import type { Component } from 'vue'
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { SPRING, staggerDelay } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useCountUp } from '@/composables/useCountUp'

// 概览统计卡：图标 + 数值 + 标签，带逐项错峰入场，用于页面顶部 KPI 卡条。
const props = withDefaults(
  defineProps<{
    label: string
    value: string | number
    icon?: Component
    tone?: 'primary' | 'success' | 'warning' | 'danger' | 'muted'
    index?: number
    /** 鼠标悬浮提示，如「基于前 200 条统计」 */
    hint?: string
    /** 数值为 number 时启用滚动计数 + 千分位（默认关闭，不影响既有用法） */
    animateValue?: boolean
    /** 数值后缀，如 '%' */
    suffix?: string
  }>(),
  { tone: 'primary', index: 0 },
)

const reduce = usePreferredReducedMotion()

// 滚动计数：仅在 animateValue 且 value 为数字时生效；否则原样渲染。
const animated = useCountUp(() => (typeof props.value === 'number' ? props.value : 0))
const displayValue = computed(() => {
  if (props.animateValue && typeof props.value === 'number') {
    const d = Number.isInteger(props.value) ? 0 : 1
    return (
      animated.value.toLocaleString('zh-CN', {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      }) + (props.suffix ?? '')
    )
  }
  return props.value
})

const toneClass = computed(
  () =>
    ({
      primary: 'bg-primary/10 text-primary',
      success: 'bg-success/10 text-success',
      warning: 'bg-warning/10 text-warning',
      danger: 'bg-destructive/10 text-destructive',
      muted: 'bg-muted text-muted-foreground',
    })[props.tone],
)
</script>

<template>
  <Motion
    :initial="reduce === 'reduce' ? false : { opacity: 0, y: 8 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ ...SPRING, delay: reduce === 'reduce' ? 0 : staggerDelay(index) }"
    class="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sp transition-shadow hover:shadow-sp-lg"
    :title="hint"
  >
    <div
      v-if="icon"
      :class="cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', toneClass)"
    >
      <component :is="icon" class="h-[18px] w-[18px]" />
    </div>
    <div class="min-w-0">
      <div class="text-xl font-semibold leading-none tabular-nums">{{ displayValue }}</div>
      <div class="mt-1 truncate text-xs text-muted-foreground">
        {{ label }}<span v-if="hint" class="ml-0.5 align-super text-[10px] text-muted-foreground/60"
          >≈</span
        >
      </div>
    </div>
  </Motion>
</template>
