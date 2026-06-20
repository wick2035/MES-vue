<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  ClipboardList,
  Boxes,
  CheckCircle2,
  Loader,
  Trash2,
  Gauge,
  RefreshCw,
} from 'lucide-vue-next'
import type { EChartsOption } from 'echarts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import SpChart from '@/components/common/SpChart.vue'
import { getDashboardData } from '@/api/modules/dashboard'
import type { DashboardData } from '@/types/domain'

defineOptions({ name: 'Dashboard' })

const data = ref<DashboardData | null>(null)
const loading = ref(true)
const updatedAt = ref('')
let timer: number | undefined

async function load(silent = false) {
  if (!silent) loading.value = true
  try {
    const res = await getDashboardData()
    data.value = res.data ?? null
    updatedAt.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  } finally {
    loading.value = false
  }
}
onMounted(() => {
  load()
  timer = window.setInterval(() => load(true), 30000) // 30s 轮询，体现实时性
})
onUnmounted(() => timer && clearInterval(timer))

const ov = computed(() => data.value?.overview)
const kpis = computed(() => [
  {
    label: '工单总数',
    value: ov.value?.orderCount ?? 0,
    icon: ClipboardList,
    tone: 'bg-primary/10 text-primary',
  },
  {
    label: '计划产量',
    value: ov.value?.planQty ?? 0,
    icon: Boxes,
    tone: 'bg-muted text-muted-foreground',
  },
  {
    label: '完工数量',
    value: ov.value?.completedQty ?? 0,
    icon: CheckCircle2,
    tone: 'bg-success/10 text-success',
  },
  {
    label: '在制数量',
    value: ov.value?.inProcessQty ?? 0,
    icon: Loader,
    tone: 'bg-warning/10 text-warning',
  },
  {
    label: '报废数量',
    value: ov.value?.scrappedQty ?? 0,
    icon: Trash2,
    tone: 'bg-destructive/10 text-destructive',
  },
  {
    label: '良品率',
    value: `${ov.value?.yieldRate ?? 0}%`,
    icon: Gauge,
    tone: 'bg-primary/10 text-primary',
  },
])

const orderStatusOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'item' },
  legend: { bottom: 0, type: 'scroll' },
  series: [
    {
      type: 'pie',
      radius: ['42%', '68%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: 'transparent', borderWidth: 2 },
      label: { show: false },
      data: data.value?.orderStatus?.status ?? [],
    },
  ],
}))

const processFlowOption = computed<EChartsOption>(() => {
  const flow = data.value?.processFlow ?? []
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { bottom: 0 },
    grid: { left: 10, right: 16, top: 20, bottom: 36, containLabel: true },
    xAxis: { type: 'category', data: flow.map((f) => f.operDesc) },
    yAxis: { type: 'value' },
    series: [
      { name: '合格', type: 'bar', stack: 't', color: '#16A34A', data: flow.map((f) => f.ok) },
      { name: '不良', type: 'bar', stack: 't', color: '#DC2626', data: flow.map((f) => f.ng) },
    ],
  }
})

const achievementOption = computed<EChartsOption>(() => {
  const a = data.value?.achievement ?? []
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => `${v}%` },
    grid: { left: 10, right: 16, top: 20, bottom: 30, containLabel: true },
    xAxis: { type: 'value', max: 100 },
    yAxis: { type: 'category', data: a.map((x) => x.orderCode), inverse: true },
    series: [
      {
        type: 'bar',
        data: a.map((x) => x.rate),
        itemStyle: { borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right', formatter: '{c}%' },
      },
    ],
  }
})

const defectOption = computed<EChartsOption>(() => {
  const p = data.value?.defect?.perProcess ?? []
  return {
    tooltip: { trigger: 'axis', valueFormatter: (v) => `${v}%` },
    grid: { left: 10, right: 16, top: 20, bottom: 36, containLabel: true },
    xAxis: { type: 'category', data: p.map((x) => x.operDesc) },
    yAxis: { type: 'value' },
    series: [
      {
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.15 },
        color: '#DC2626',
        data: p.map((x) => x.defectRate),
      },
    ],
  }
})

const inventoryOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'item' },
  legend: { bottom: 0, type: 'scroll' },
  series: [
    {
      type: 'pie',
      roseType: 'radius',
      radius: ['30%', '68%'],
      itemStyle: { borderRadius: 6 },
      label: { show: false },
      data: data.value?.inventory?.byWarehouse ?? [],
    },
  ],
}))

const personnelOption = computed<EChartsOption>(() => {
  const p = data.value?.personnel ?? []
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 10, right: 16, top: 20, bottom: 30, containLabel: true },
    xAxis: { type: 'category', data: p.map((x) => x.name) },
    yAxis: { type: 'value' },
    series: [
      {
        type: 'bar',
        data: p.map((x) => x.value),
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        barWidth: '50%',
      },
    ],
  }
})
</script>

<template>
  <div class="space-y-4">
    <!-- 生产总览：克制信息条 -->
    <div
      class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-l-4 border-l-primary bg-card px-5 py-4 shadow-sp"
    >
      <div>
        <h2 class="text-lg font-semibold tracking-tight text-foreground">生产总览</h2>
        <p class="mt-0.5 text-sm text-muted-foreground">数据更新于 {{ updatedAt || '—' }} · 实时同步</p>
      </div>
      <Button variant="outline" size="sm" @click="load()">
        <RefreshCw class="h-4 w-4" :class="loading && 'animate-spin'" />刷新
      </Button>
    </div>

    <!-- KPI -->
    <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Card v-for="k in kpis" :key="k.label" class="rounded-xl">
        <CardContent class="flex items-center gap-3 p-4">
          <div :class="['flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', k.tone]">
            <component :is="k.icon" class="h-5 w-5" />
          </div>
          <div class="min-w-0">
            <div class="truncate text-xs text-muted-foreground">{{ k.label }}</div>
            <Skeleton v-if="loading" class="mt-1 h-7 w-16" />
            <div v-else class="text-2xl font-semibold tracking-tight tabular-nums">{{ k.value }}</div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle class="text-base">订单状态分布</CardTitle></CardHeader>
        <CardContent>
          <Skeleton v-if="loading" class="h-72 w-full" />
          <SpChart v-else :option="orderStatusOption" class="h-72" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle class="text-base">工序合格 / 不良</CardTitle></CardHeader>
        <CardContent>
          <Skeleton v-if="loading" class="h-72 w-full" />
          <SpChart v-else :option="processFlowOption" class="h-72" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle class="text-base">工单达成率</CardTitle></CardHeader>
        <CardContent>
          <Skeleton v-if="loading" class="h-72 w-full" />
          <SpChart v-else :option="achievementOption" class="h-72" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle class="text-base">各工序不良率</CardTitle></CardHeader>
        <CardContent>
          <Skeleton v-if="loading" class="h-72 w-full" />
          <SpChart v-else :option="defectOption" class="h-72" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle class="text-base">库房库存分布</CardTitle></CardHeader>
        <CardContent>
          <Skeleton v-if="loading" class="h-72 w-full" />
          <SpChart v-else :option="inventoryOption" class="h-72" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle class="text-base">班组人员分布</CardTitle></CardHeader>
        <CardContent>
          <Skeleton v-if="loading" class="h-72 w-full" />
          <SpChart v-else :option="personnelOption" class="h-72" />
        </CardContent>
      </Card>
    </div>
  </div>
</template>
