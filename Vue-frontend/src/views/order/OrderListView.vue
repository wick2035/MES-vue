<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { useRouter } from 'vue-router'
import {
  Search,
  RotateCcw,
  Eye,
  Trash2,
  BadgeCheck,
  PlayCircle,
  Flag,
  Truck,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import SpDataTable from '@/components/common/SpDataTable.vue'
import SpStatusBadge from '@/components/common/SpStatusBadge.vue'
import SpConfirm from '@/components/common/SpConfirm.vue'
import SpChart from '@/components/common/SpChart.vue'
import { useTable } from '@/composables/useTable'
import { pageOrders, deleteOrder } from '@/api/modules/order'
import { notify } from '@/lib/toast'
import { statueTone, workTone, completeTone, deliveryTone, orderTypeName } from '@/lib/orderStatus'
import type { TableColumn } from '@/types/table'
import type { Order } from '@/types/domain'
import type {
  EChartsOption,
  CustomSeriesRenderItemAPI,
  CustomSeriesRenderItemParams,
} from 'echarts'

defineOptions({ name: 'Order' })

const router = useRouter()
const { loading, list, total, query, load, onPageChange, onSizeChange, search, reset } =
  useTable<Order>(pageOrders, { orderCodeLike: '', materielDescLike: '', statue: undefined })
useAutoRefresh(load)

// 四联状态汇总（本页工单口径）：已审批 / 未动工 / 待完工 / 待交付
const summary = computed(() => {
  const rows = list.value ?? []
  const approved = rows.filter((r) => (r.statue ?? 0) >= 2).length
  const notStarted = rows.filter((r) => r.workStatus !== 'STARTED').length
  const notCompleted = rows.filter((r) => r.completeStatus !== 'COMPLETED').length
  const notDelivered = rows.filter((r) => r.deliveryStatus !== 'DELIVERED').length
  return [
    {
      label: '已审批',
      value: approved,
      icon: BadgeCheck,
      tint: 'text-primary',
      ring: 'ring-primary/15',
      bg: 'bg-primary/10',
    },
    {
      label: '未动工',
      value: notStarted,
      icon: PlayCircle,
      tint: 'text-muted-foreground',
      ring: 'ring-border',
      bg: 'bg-muted',
    },
    {
      label: '待完工',
      value: notCompleted,
      icon: Flag,
      tint: 'text-warning',
      ring: 'ring-warning/20',
      bg: 'bg-warning/10',
    },
    {
      label: '待交付',
      value: notDelivered,
      icon: Truck,
      tint: 'text-success',
      ring: 'ring-success/20',
      bg: 'bg-success/10',
    },
  ]
})

const ALL = 'ALL'
const statueOptions = [
  { label: '全部状态', value: ALL },
  { label: '待审批', value: '1' },
  { label: '已审批', value: '2' },
  { label: '已下发', value: '5' },
  { label: '已结束', value: '3' },
  { label: '已终结', value: '4' },
]

const columns: TableColumn[] = [
  { key: 'orderCode', title: '工单编号', width: '170px' },
  { key: 'materielDesc', title: '物料' },
  { key: 'qty', title: '数量', width: '80px', align: 'right' },
  {
    key: 'orderType',
    title: '类型',
    width: '80px',
    align: 'center',
    formatter: (r) => orderTypeName(r.orderType),
  },
  { key: 'mainStatusName', title: '审批状态', slot: 'statue', width: '110px', align: 'center' },
  { key: 'workStatusName', title: '动工', slot: 'work', width: '90px', align: 'center' },
  { key: 'completeStatusName', title: '完工', slot: 'complete', width: '90px', align: 'center' },
  { key: 'deliveryStatusName', title: '交付', slot: 'delivery', width: '90px', align: 'center' },
  { key: 'action', title: '操作', slot: 'action', width: '150px', align: 'center' },
]

// 工单主状态 → 甘特条颜色（沿用 statueTone 语义，落到 SpChart 调色板 hex）
function statueHex(statue?: number): string {
  switch (statue) {
    case 1:
      return '#D97706' // 待审批
    case 2:
    case 5:
      return '#2563EB' // 已审批 / 已下发
    case 3:
      return '#16A34A' // 已结束
    case 4:
      return '#94A3B8' // 已终结
    default:
      return '#94A3B8'
  }
}

// 甘特数据源：当前页中带有合法计划起止时间的工单
const ganttRows = computed(() =>
  (list.value ?? [])
    .map((o) => ({
      o,
      s: o.planStartTime ? new Date(o.planStartTime).getTime() : NaN,
      e: o.planEndTime ? new Date(o.planEndTime).getTime() : NaN,
    }))
    .filter((r) => Number.isFinite(r.s) && Number.isFinite(r.e) && r.e >= r.s),
)

// 订单级甘特图：每个工单一条横条（计划起止），按主状态着色
const ganttOption = computed<EChartsOption>(() => {
  const rows = ganttRows.value
  return {
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        const item = Array.isArray(p) ? p[0] : p
        const r = item ? rows[item.dataIndex] : undefined
        if (!r) return ''
        return `${r.o.orderCode ?? ''}<br/>计划：${r.o.planStartTime ?? '—'} ~ ${r.o.planEndTime ?? '—'}<br/>状态：${r.o.mainStatusName ?? '—'}`
      },
    },
    grid: { left: 12, right: 24, top: 12, bottom: 24, containLabel: true },
    xAxis: { type: 'time' },
    yAxis: {
      type: 'category',
      inverse: true,
      data: rows.map((r) => r.o.orderCode ?? r.o.id ?? ''),
    },
    series: [
      {
        type: 'custom',
        encode: { x: [1, 2], y: 0 },
        renderItem: (_params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI) => {
          const yIdx = api.value(0) as number
          const start = api.coord([api.value(1), yIdx])
          const end = api.coord([api.value(2), yIdx])
          const bandHeight = (api.size?.([0, 1]) as number[])?.[1] ?? 20
          const h = bandHeight * 0.5
          return {
            type: 'rect',
            shape: {
              x: start[0],
              y: start[1] - h / 2,
              width: Math.max(end[0] - start[0], 2),
              height: h,
              r: 3,
            },
            style: api.style(),
          }
        },
        data: rows.map((r, i) => ({
          value: [i, r.s, r.e],
          itemStyle: { color: statueHex(r.o.statue) },
        })),
      },
    ],
  }
})

function goDetail(row: Order) {
  router.push(`/production/order/${row.id}`)
}

const confirmOpen = ref(false)
const target = ref<Order | null>(null)
function askDelete(row: Order) {
  target.value = row
  confirmOpen.value = true
}
async function onDelete() {
  if (!target.value?.id) return
  await deleteOrder(target.value.id)
  notify.success('删除成功')
  confirmOpen.value = false
  load()
}

function onReset() {
  reset(['orderCodeLike', 'materielDescLike', 'statue'])
}
</script>

<template>
  <div class="space-y-4">
    <!-- 四联状态汇总条：始终单行排满不折行 -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div
        v-for="s in summary"
        :key="s.label"
        :class="[
          'flex items-center gap-3 whitespace-nowrap rounded-xl border bg-card p-3 shadow-sp ring-1 transition-colors',
          s.ring,
        ]"
      >
        <div
          :class="['flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', s.bg, s.tint]"
        >
          <component :is="s.icon" class="h-5 w-5" />
        </div>
        <div class="min-w-0">
          <div class="text-xs text-muted-foreground">{{ s.label }}</div>
          <div :class="['text-xl font-bold tabular-nums leading-tight', s.tint]">{{ s.value }}</div>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sp">
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">工单编号</Label>
        <Input
          v-model="query.orderCodeLike"
          placeholder="编号"
          class="w-40"
          @keyup.enter="search"
        />
      </div>
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">物料</Label>
        <Input
          v-model="query.materielDescLike"
          placeholder="物料名称"
          class="w-40"
          @keyup.enter="search"
        />
      </div>
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">状态</Label>
        <Select
          :model-value="query.statue != null ? String(query.statue) : ALL"
          @update:model-value="query.statue = $event && $event !== ALL ? Number($event) : undefined"
        >
          <SelectTrigger class="w-36"><SelectValue placeholder="全部状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem v-for="o in statueOptions" :key="o.value" :value="o.value">{{
              o.label
            }}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button @click="search"><Search class="h-4 w-4" />查询</Button>
      <Button variant="outline" @click="onReset"><RotateCcw class="h-4 w-4" />重置</Button>
    </div>

    <SpDataTable
      :columns="columns"
      :data="list"
      :loading="loading"
      :total="total"
      :page="query.current"
      :page-size="query.size"
      @page-change="onPageChange"
      @size-change="onSizeChange"
    >
      <template #toolbar>
        <span class="text-sm font-medium">生产工单</span>
        <span class="text-xs text-muted-foreground"
          >工单由生产订单下发产生，此处跟踪全生命周期流转</span
        >
      </template>
      <template #statue="{ row }">
        <SpStatusBadge :tone="statueTone(row.statue)" :text="row.mainStatusName" />
      </template>
      <template #work="{ row }">
        <SpStatusBadge :tone="workTone(row.workStatus)" :text="row.workStatusName" />
      </template>
      <template #complete="{ row }">
        <SpStatusBadge :tone="completeTone(row.completeStatus)" :text="row.completeStatusName" />
      </template>
      <template #delivery="{ row }">
        <SpStatusBadge :tone="deliveryTone(row.deliveryStatus)" :text="row.deliveryStatusName" />
      </template>
      <template #action="{ row }">
        <div class="flex items-center justify-center gap-1">
          <Button variant="ghost" size="icon-sm" title="查看详情" @click="goDetail(row)">
            <Eye class="h-4 w-4" />
          </Button>
          <Button
            v-if="row.statue === 1"
            variant="ghost"
            size="icon-sm"
            title="删除"
            @click="askDelete(row)"
          >
            <Trash2 class="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </template>
    </SpDataTable>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">订单排程甘特图</CardTitle>
      </CardHeader>
      <CardContent>
        <SpChart
          v-if="ganttRows.length"
          :option="ganttOption"
          :style="{ height: Math.max(240, ganttRows.length * 34 + 60) + 'px' }"
        />
        <div v-else class="py-10 text-center text-sm text-muted-foreground">
          当前列表无可展示的计划时间
        </div>
      </CardContent>
    </Card>

    <SpConfirm
      v-model:open="confirmOpen"
      title="删除工单"
      :description="`确定删除工单「${target?.orderCode ?? ''}」吗？仅待审批工单可删除。`"
      @confirm="onDelete"
    />
  </div>
</template>
