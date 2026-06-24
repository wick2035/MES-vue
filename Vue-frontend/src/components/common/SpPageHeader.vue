<script setup lang="ts">
import type { Component } from 'vue'
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { SPRING_SOFT } from '@/lib/motion'
import { cn } from '@/lib/utils'

// 统一页眉：图标 + 标题 + 副标题 + 右侧操作槽，给每个页面一致的高级身份感。
const props = withDefaults(
  defineProps<{
    icon?: Component
    title: string
    subtitle?: string
    iconTone?: 'primary' | 'success' | 'warning' | 'muted'
  }>(),
  { iconTone: 'primary' },
)

const reduce = usePreferredReducedMotion()

const toneClass = computed(
  () =>
    ({
      primary: 'bg-primary/10 text-primary',
      success: 'bg-success/10 text-success',
      warning: 'bg-warning/10 text-warning',
      muted: 'bg-muted text-muted-foreground',
    })[props.iconTone],
)
</script>

<template>
  <Motion
    :initial="reduce === 'reduce' ? false : { opacity: 0, y: -8 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="SPRING_SOFT"
    class="flex flex-wrap items-center gap-3"
  >
    <div
      v-if="icon"
      :class="cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', toneClass)"
    >
      <component :is="icon" class="h-5 w-5" />
    </div>
    <div class="min-w-0">
      <h1 class="truncate text-lg font-semibold leading-tight">{{ title }}</h1>
      <p v-if="subtitle" class="truncate text-sm text-muted-foreground">{{ subtitle }}</p>
    </div>
    <div class="ml-auto flex items-center gap-2">
      <slot name="actions" />
    </div>
  </Motion>
</template>
