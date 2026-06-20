<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'

// 表格加载骨架屏
withDefaults(defineProps<{ rows?: number; cols?: number }>(), { rows: 6, cols: 5 })
</script>

<template>
  <div class="space-y-2 p-2">
    <div v-for="r in rows" :key="r" class="flex items-center gap-4">
      <Skeleton v-for="c in cols" :key="c" class="h-6 flex-1" />
    </div>
  </div>
</template>
