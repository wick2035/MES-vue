<script setup lang="ts">
import type { Component } from 'vue'
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { SPRING_SOFT, staggerDelay } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

// 图表卡统一外壳：图标 + 标题 + 右侧插槽 + 等高图表区，带逐项错峰入场。
// 关键：高度由 bodyClass 容器持有，内部 <SpChart class="h-full"> 填充，避免 SpChart 无内在高度塌成 0。
const props = withDefaults(
  defineProps<{
    icon?: Component
    title: string
    loading?: boolean
    /** 图表区高度类，如 'h-72' | 'h-80' */
    bodyClass?: string
    iconTone?: 'primary' | 'success' | 'warning' | 'danger' | 'muted'
    index?: number
  }>(),
  { bodyClass: 'h-72', iconTone: 'primary', index: 0 },
)

const reduce = usePreferredReducedMotion()

const toneClass = computed(
  () =>
    ({
      primary: 'bg-primary/10 text-primary',
      success: 'bg-success/10 text-success',
      warning: 'bg-warning/10 text-warning',
      danger: 'bg-destructive/10 text-destructive',
      muted: 'bg-muted text-muted-foreground',
    })[props.iconTone],
)
</script>

<template>
  <Motion
    :initial="reduce === 'reduce' ? false : { opacity: 0, y: 10 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ ...SPRING_SOFT, delay: reduce === 'reduce' ? 0 : staggerDelay(index, 0.05, 0.35) }"
    class="flex flex-col rounded-xl border bg-card shadow-sp transition-shadow hover:shadow-sp-lg"
  >
    <div class="flex items-center gap-2 border-b px-4 py-3">
      <div
        v-if="icon"
        :class="cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', toneClass)"
      >
        <component :is="icon" class="h-[15px] w-[15px]" />
      </div>
      <h3 class="truncate text-sm font-semibold tracking-tight">{{ title }}</h3>
      <div class="ml-auto flex items-center gap-2">
        <slot name="right" />
      </div>
    </div>
    <div class="p-3">
      <Skeleton v-if="loading" :class="cn('w-full', bodyClass)" />
      <div v-else :class="bodyClass">
        <slot />
      </div>
    </div>
  </Motion>
</template>
