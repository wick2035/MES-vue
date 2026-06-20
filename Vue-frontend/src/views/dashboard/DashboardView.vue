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
let timer: number | undefined

async function load(silent = false) {
  if (!silent) loading.value = true
  try {
    const res = await getDashboardData()
    data.value = res.data ?? null
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
    gradient: 'from-blue-500 to-indigo-500',
  },
  {
    label: '计划产量',
    value: ov.value?.planQty ?? 0,
    icon: Boxes,
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    label: '完工数量',
    value: ov.value?.completedQty ?? 0,
    icon: CheckCircle2,
    gradient: 'from-emerald-500 to-green-500',
  },
  {
    label: '在制数量',
    value: ov.value?.inProcessQty ?? 0,
    icon: Loader,
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    label: '报废数量',
    value: ov.value?.scrappedQty ?? 0,
    icon: Trash2,
    gradient: 'from-rose-500 to-red-500',
  },
  {
    label: '良品率',
    value: `${ov.value?.yieldRate ?? 0}%`,
    icon: Gauge,
    gradient: 'from-cyan-500 to-sky-500',
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
    <!-- 英雄区：渐变品牌带 + 实时状态 -->
    <div
      class="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/95 via-primary to-indigo-600 px-6 py-5 text-white shadow-sp-lg"
    >
      <div
        class="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl"
      />
      <div
        class="pointer-events-none absolute -bottom-20 right-24 h-44 w-44 rounded-full bg-cyan-300/20 blur-3xl"
      />
      <div class="relative flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-xl font-semibold tracking-tight">智能制造数据中心</h2>
          <p class="mt-1 flex items-center gap-2 text-sm text-white/80">
            <span class="relative flex h-2 w-2">
              <span
                class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75"
              />
              <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            全部指标来自真实业务数据 · 每 30 秒自动刷新
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          class="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          @click="load()"
        >
          <RefreshCw class="h-4 w-4" />刷新
        </Button>
      </div>
    </div>

    <!-- KPI -->
    <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Card
        v-for="k in kpis"
        :key="k.label"
        class="group relative overflow-hidden rounded-2xl ring-1 ring-transparent transition-all duration-200 hover:-translate-y-1 hover:shadow-sp-lg hover:ring-primary/20"
      >
        <div :class="['absolute inset-x-0 top-0 h-1 bg-gradient-to-r', k.gradient]" />
        <CardContent class="flex items-center gap-3 p-4">
          <div
            :class="[
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm transition-transform duration-200 group-hover:scale-110',
              k.gradient,
            ]"
          >
            <component :is="k.icon" class="h-5 w-5" />
          </div>
          <div class="min-w-0">
            <div class="truncate text-xs text-muted-foreground">{{ k.label }}</div>
            <Skeleton v-if="loading" class="mt-1 h-7 w-16" />
            <div v-else class="text-2xl font-bold tracking-tight tabular-nums">{{ k.value }}</div>
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
