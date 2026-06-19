<script setup lang="ts">
import { Gauge } from 'lucide-vue-next'
// 占位页：完整的 ECharts 多图数据看板在 M8 接入。

const placeholders = [
  { label: '工单总数', value: '—' },
  { label: '计划产量', value: '—' },
  { label: '完工数量', value: '—' },
  { label: '良品率', value: '—' },
]
</script>

<template>
  <div class="space-y-4">
    <div class="rounded-lg border bg-card p-6 shadow-sp">
      <div class="flex items-center gap-3">
        <Gauge class="h-8 w-8 text-primary" />
        <div>
          <h1 class="text-xl font-semibold">智能制造数据看板</h1>
          <p class="text-sm text-muted-foreground">
            脚手架已就绪，数据可视化看板将在后续里程碑接入。
          </p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="card in placeholders"
        :key="card.label"
        class="rounded-lg border bg-card p-5 shadow-sp"
      >
        <p class="text-sm text-muted-foreground">{{ card.label }}</p>
        <p class="mt-2 text-2xl font-bold text-primary">{{ card.value }}</p>
      </div>
    </div>
  </div>
</template>
