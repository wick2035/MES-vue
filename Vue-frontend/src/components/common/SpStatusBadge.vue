<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'muted'

const props = withDefaults(defineProps<{ text?: string; tone?: Tone }>(), { tone: 'info' })

const toneClass = computed(
  () =>
    ({
      success: 'bg-success/10 text-success border-success/30',
      warning: 'bg-warning/10 text-warning border-warning/30',
      danger: 'bg-destructive/10 text-destructive border-destructive/30',
      info: 'bg-primary/10 text-primary border-primary/30',
      muted: 'bg-muted text-muted-foreground border-border',
    })[props.tone],
)
</script>

<template>
  <span
    :class="
      cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', toneClass)
    "
  >
    <span class="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
    <slot>{{ text }}</slot>
  </span>
</template>
