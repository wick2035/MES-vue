<script setup lang="ts">
import type { Component } from 'vue'
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue'
import {
  ClipboardList,
  Boxes,
  CheckCircle2,
  Loader,
  Trash2,
  Gauge,
  RefreshCw,
  LayoutDashboard,
  PieChart,
  BarChart3,
  Target,
  Activity,
  Warehouse,
  Users,
} from 'lucide-vue-next'
import type { EChartsOption } from 'echarts'
import { Button } from '@/components/ui/button'
import SpPageHeader from '@/components/common/SpPageHeader.vue'
import SpStatCard from '@/components/common/SpStatCard.vue'
import SpChart from '@/components/common/SpChart.vue'
import SpChartCard from '@/components/common/SpChartCard.vue'
import { getDashboardData } from '@/api/modules/dashboard'
import type { DashboardData } from '@/types/domain'
import { useAppStore } from '@/stores/app'

defineOptions({ name: 'Dashboard' })

const data = ref<DashboardData | null>(null)
const loading = ref(true)
const updatedAt = ref('')
const appStore = useAppStore()
const reduce = usePreferredReducedMotion()

// ECharts canvas 内文本/标线颜色不能用 CSS 变量，按主题解析具体色。
const fg = computed(() => (appStore.theme === 'dark' ? '#E2E8F0' : '#1E293B'))
const subFg = computed(() => (appStore.theme === 'dark' ? '#94A3B8' : '#64748B'))
// 折线空心点的填充用卡片底色（≈ hsl(220 45% 12%)），暗色下才真正“空心”。
const cardBg = computed(() => (appStore.theme === 'dark' ? '#111A2C' : '#FFFFFF'))
// 无障碍：偏好减少动效时关闭图表加载动画。
const anim = computed(() => reduce.value !== 'reduce')

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
// 首次进入加载并开 30s 轮询；离开停轮询。再次切回该 tab 不重新拉数据（用缓存、不闪骨架），
// 但通过 renderKey 重挂内容来重播入场动效。
let timer: ReturnType<typeof setInterval> | null = null
function startPoll() {
  stopPoll()
  timer = setInterval(() => load(true), 30000)
}
function stopPoll() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
// 内容重挂键：每次 keep-alive 切回自增，触发卡片/数字/图表的入场动画重播。
const renderKey = ref(0)
let firstActivate = true
onMounted(() => {
  load()
  startPoll()
})
onActivated(() => {
  startPoll()
  // 首次激活紧跟 onMounted，跳过以免重复重挂。
  if (firstActivate) {
    firstActivate = false
    return
  }
  renderKey.value++
})
onDeactivated(stopPoll)
onBeforeUnmount(stopPoll)

type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'muted'
const ov = computed(() => data.value?.overview)
const kpis = computed<Array<{ label: string; value: number; icon: Component; tone: Tone; suffix?: string }>>(
  () => [
    { label: '工单总数', value: ov.value?.orderCount ?? 0, icon: ClipboardList, tone: 'primary' },
    { label: '计划产量', value: ov.value?.planQty ?? 0, icon: Boxes, tone: 'muted' },
    { label: '完工数量', value: ov.value?.completedQty ?? 0, icon: CheckCircle2, tone: 'success' },
    { label: '在制数量', value: ov.value?.inProcessQty ?? 0, icon: Loader, tone: 'warning' },
    { label: '报废数量', value: ov.value?.scrappedQty ?? 0, icon: Trash2, tone: 'danger' },
    { label: '良品率', value: ov.value?.yieldRate ?? 0, icon: Gauge, tone: 'primary', suffix: '%' },
  ],
)

// 线性渐变（纯字面量，无需 import echarts/graphic）。horizontal=左→右。
const grad = (from: string, to: string, horizontal = false) => ({
  type: 'linear' as const,
  x: 0,
  y: 0,
  x2: horizontal ? 1 : 0,
  y2: horizontal ? 0 : 1,
  colorStops: [
    { offset: 0, color: from },
    { offset: 1, color: to },
  ],
})

// 多色柱用调色板（上浅下深），让每根柱子颜色不同，避免单调。
const BAR_GRADS = [
  ['#60A5FA', '#2563EB'],
  ['#4ADE80', '#16A34A'],
  ['#FBBF24', '#D97706'],
  ['#F87171', '#DC2626'],
  ['#A78BFA', '#7C3AED'],
  ['#22D3EE', '#0891B2'],
  ['#F472B6', '#DB2777'],
  ['#A3E635', '#65A30D'],
] as const

const orderStatusTotal = computed(() =>
  (data.value?.orderStatus?.status ?? []).reduce((s, x) => s + (x.value ?? 0), 0),
)
const orderStatusOption = computed<EChartsOption>(() => ({
  animation: anim.value,
  animationDuration: 900,
  animationEasing: 'cubicOut',
  tooltip: { trigger: 'item' },
  legend: { bottom: 0, type: 'scroll', icon: 'circle', itemWidth: 8, itemHeight: 8, itemGap: 14 },
  series: [
    {
      type: 'pie',
      radius: ['58%', '78%'],
      center: ['50%', '46%'],
      avoidLabelOverlap: true,
      padAngle: 2,
      itemStyle: { borderRadius: 8, borderColor: 'transparent', borderWidth: 0 },
      label: {
        show: true,
        position: 'center',
        formatter: () => `{v|${orderStatusTotal.value.toLocaleString('zh-CN')}}\n{l|工单总数}`,
        rich: {
          v: { fontSize: 28, fontWeight: 700, color: fg.value, lineHeight: 34 },
          l: { fontSize: 12, color: subFg.value, lineHeight: 18 },
        },
      },
      labelLine: { show: false },
      data: data.value?.orderStatus?.status ?? [],
    },
  ],
}))

const processFlowOption = computed<EChartsOption>(() => {
  const flow = data.value?.processFlow ?? []
  return {
    animation: anim.value,
    animationDuration: 900,
    animationEasing: 'cubicOut',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, itemGap: 14 },
    grid: { left: 8, right: 16, top: 16, bottom: 36, containLabel: true },
    xAxis: {
      type: 'category',
      data: flow.map((f) => f.operDesc),
      axisTick: { show: false },
      axisLine: { show: false },
    },
    yAxis: { type: 'value' },
    barCategoryGap: '40%',
    series: [
      {
        name: '合格',
        type: 'bar',
        stack: 't',
        itemStyle: { color: grad('#22C55E', '#16A34A') },
        data: flow.map((f) => f.ok),
      },
      {
        name: '不良',
        type: 'bar',
        stack: 't',
        itemStyle: { color: grad('#F87171', '#DC2626'), borderRadius: [6, 6, 0, 0] },
        data: flow.map((f) => f.ng),
      },
    ],
  }
})

const achievementOption = computed<EChartsOption>(() => {
  const a = data.value?.achievement ?? []
  return {
    animation: anim.value,
    animationDuration: 900,
    animationEasing: 'cubicOut',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => `${v}%` },
    grid: { left: 8, right: 28, top: 16, bottom: 8, containLabel: true },
    xAxis: { type: 'value', max: 100, axisLine: { show: false }, axisTick: { show: false } },
    yAxis: {
      type: 'category',
      data: a.map((x) => x.orderCode),
      inverse: true,
      axisTick: { show: false },
      axisLine: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: a.map((x) => x.rate),
        barWidth: '54%',
        itemStyle: { color: grad('#3B82F6', '#2563EB', true), borderRadius: [0, 6, 6, 0] },
        label: { show: true, position: 'right', formatter: '{c}%', color: subFg.value, fontSize: 11 },
      },
    ],
  }
})

const defectOption = computed<EChartsOption>(() => {
  const p = data.value?.defect?.perProcess ?? []
  return {
    animation: anim.value,
    animationDuration: 900,
    animationEasing: 'cubicOut',
    tooltip: { trigger: 'axis', valueFormatter: (v) => `${v}%` },
    grid: { left: 8, right: 16, top: 20, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: p.map((x) => x.operDesc),
      boundaryGap: false,
      axisTick: { show: false },
      axisLine: { show: false },
    },
    yAxis: { type: 'value' },
    series: [
      {
        type: 'line',
        smooth: true,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 8,
        // 空心点：填充取卡片底色、红色描边
        itemStyle: { color: cardBg.value, borderColor: '#DC2626', borderWidth: 2 },
        lineStyle: { width: 2.5, color: '#DC2626' },
        emphasis: { scale: 1.4 },
        areaStyle: { color: grad('rgba(220,38,38,0.22)', 'rgba(220,38,38,0.01)') },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'dashed', color: subFg.value },
          label: { formatter: '均值 {c}%', position: 'end', fontSize: 11, color: subFg.value },
          data: [{ type: 'average', name: '均值' }],
        },
        data: p.map((x) => x.defectRate),
      },
    ],
  }
})

const inventoryTotal = computed(() =>
  (data.value?.inventory?.byWarehouse ?? []).reduce((s, x) => s + (x.value ?? 0), 0),
)
const inventoryOption = computed<EChartsOption>(() => ({
  animation: anim.value,
  animationDuration: 900,
  animationEasing: 'cubicOut',
  tooltip: { trigger: 'item', valueFormatter: (v) => Number(v).toLocaleString('zh-CN') },
  legend: { bottom: 0, type: 'scroll', icon: 'circle', itemWidth: 8, itemHeight: 8, itemGap: 14 },
  series: [
    {
      type: 'pie',
      radius: ['52%', '74%'],
      center: ['50%', '46%'],
      avoidLabelOverlap: true,
      padAngle: 2,
      itemStyle: { borderRadius: 8, borderColor: 'transparent', borderWidth: 0 },
      label: {
        show: true,
        position: 'center',
        formatter: () => `{v|${inventoryTotal.value.toLocaleString('zh-CN')}}\n{l|库存总量}`,
        rich: {
          v: { fontSize: 26, fontWeight: 700, color: fg.value, lineHeight: 32 },
          l: { fontSize: 12, color: subFg.value, lineHeight: 18 },
        },
      },
      labelLine: { show: false },
      data: data.value?.inventory?.byWarehouse ?? [],
    },
  ],
}))

const personnelOption = computed<EChartsOption>(() => {
  const p = data.value?.personnel ?? []
  return {
    animation: anim.value,
    animationDuration: 900,
    animationEasing: 'cubicOut',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: p.map((x) => x.name),
      axisTick: { show: false },
      axisLine: { show: false },
    },
    yAxis: { type: 'value' },
    series: [
      {
        type: 'bar',
        barWidth: '46%',
        data: p.map((x, i) => ({
          value: x.value,
          itemStyle: {
            color: grad(BAR_GRADS[i % BAR_GRADS.length][0], BAR_GRADS[i % BAR_GRADS.length][1]),
            borderRadius: [6, 6, 0, 0],
          },
        })),
      },
    ],
  }
})
</script>

<template>
  <!-- key 随 keep-alive 切回自增 → 整块重挂，重播入场动画 -->
  <div :key="renderKey" class="space-y-5">
    <!-- 页眉（卡片化，左侧主色描边作标题条标识） -->
    <div class="rounded-xl border border-l-4 border-l-primary bg-card px-5 py-4 shadow-sp">
      <SpPageHeader
        :icon="LayoutDashboard"
        title="生产数据看板"
        :subtitle="`数据更新于 ${updatedAt || '—'} · 实时同步`"
      >
        <template #actions>
          <span
            class="hidden items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-success sm:inline-flex"
          >
            <span class="relative flex h-2 w-2">
              <span
                v-if="reduce !== 'reduce'"
                class="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60"
              />
              <span class="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            实时
          </span>
          <Button variant="outline" size="sm" @click="load()">
            <RefreshCw class="h-4 w-4" :class="loading && 'animate-spin'" />刷新
          </Button>
        </template>
      </SpPageHeader>
    </div>

    <!-- KPI -->
    <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <SpStatCard
        v-for="(k, i) in kpis"
        :key="k.label"
        :label="k.label"
        :value="k.value"
        :icon="k.icon"
        :tone="k.tone"
        :index="i"
        :suffix="k.suffix"
        animate-value
      />
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <SpChartCard :icon="PieChart" title="订单状态分布" :loading="loading" :index="0">
        <SpChart :option="orderStatusOption" class="h-full" />
      </SpChartCard>
      <SpChartCard :icon="BarChart3" title="工序合格 / 不良" :loading="loading" :index="1">
        <SpChart :option="processFlowOption" class="h-full" />
      </SpChartCard>
      <SpChartCard :icon="Target" title="工单达成率" :loading="loading" :index="2">
        <SpChart :option="achievementOption" class="h-full" />
      </SpChartCard>
      <SpChartCard :icon="Activity" title="各工序不良率" :loading="loading" :index="3">
        <SpChart :option="defectOption" class="h-full" />
      </SpChartCard>
      <SpChartCard :icon="Warehouse" title="库房库存分布" :loading="loading" :index="4">
        <SpChart :option="inventoryOption" class="h-full" />
      </SpChartCard>
      <SpChartCard :icon="Users" title="班组人员分布" :loading="loading" :index="5">
        <SpChart :option="personnelOption" class="h-full" />
      </SpChartCard>
    </div>
  </div>
</template>
