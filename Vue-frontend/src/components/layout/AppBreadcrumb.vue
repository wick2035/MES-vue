<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ChevronRight } from 'lucide-vue-next'

const route = useRoute()

/** 由 route.matched 推导面包屑（取有 title 的层级） */
const crumbs = computed(() =>
  route.matched
    .filter((m) => m.meta?.title)
    .map((m) => ({ title: m.meta.title as string, path: m.path })),
)
</script>

<template>
  <nav class="flex items-center gap-1 text-sm text-muted-foreground">
    <template v-for="(c, i) in crumbs" :key="c.path">
      <ChevronRight v-if="i > 0" class="h-3.5 w-3.5" />
      <span :class="i === crumbs.length - 1 ? 'font-medium text-foreground' : ''">{{ c.title }}</span>
    </template>
  </nav>
</template>
