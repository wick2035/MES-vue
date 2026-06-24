<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  LoaderCircle,
  RotateCcw,
  Route,
  ScanLine,
  Search,
  SlidersHorizontal,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import SpDataTable from '@/components/common/SpDataTable.vue'
import SpStatusBadge from '@/components/common/SpStatusBadge.vue'
import { useTable } from '@/composables/useTable'
import { getSnRoute, listScanOrders, pageSnRecords, scanSn } from '@/api/modules/wip'
import { notify } from '@/lib/toast'
import { cn } from '@/lib/utils'
import type { TableColumn } from '@/types/table'
import type { Order, SnRecord, SnRouteStep } from '@/types/domain'

defineOptions({ name: 'SnRecords' })

const router = useRouter()
const ALL = 'ALL'
const { loading, list, total, query, load, onPageChange, onSizeChange, search, reset } =
  useTable<SnRecord>(pageSnRecords, { snLike: '', orderCodeLike: '', status: undefined })
onMounted(load)

const columns: TableColumn[] = [
  { key: 'sn', title: 'SN 序列号', width: '200px' },
  { key: 'orderCode', title: '工单', width: '170px' },
  { key: 'operDesc', title: '工序' },
  { key: 'stepNo', title: '工序号', width: '90px', align: 'center' },
  { key: 'status', title: '结果', slot: 'status', width: '90px', align: 'center' },
  { key: 'createTime', title: '采集时间', width: '170px' },
  { key: 'action', title: '操作', slot: 'action', width: '90px', align: 'center' },
]

const scanOpen = ref(false)
const scanning = ref(false)
const routeLoading = ref(false)
const manualOverride = ref(false)
const orders = ref<Order[]>([])
const routeSteps = ref<SnRouteStep[]>([])
const scanForm = reactive({ orderId: '', sn: '', status: 'OK', operId: '', remark: '' })
let routeTimer: number | undefined
let routeRequestSeq = 0

const selectedOrder = computed(() => orders.value.find((item) => item.id === scanForm.orderId))
const currentStep = computed(() => routeSteps.value.find((item) => item.current))
const selectedStep = computed(() => routeSteps.value.find((item) => item.operId === scanForm.operId))
const doneCount = computed(() => routeSteps.value.filter((item) => item.done).length)
const canSubmit = computed(
  () => Boolean(scanForm.orderId && scanForm.sn.trim() && scanForm.operId && !scanning.value),
)

function stepName(step?: SnRouteStep) {
  if (!step) return '等待选择工单和 SN'
  return step.operDesc || step.oper || step.operId
}

function stepMeta(step?: SnRouteStep) {
  if (!step) return '系统会自动定位下一道待采集工序'
  const code = step.oper ? ` · ${step.oper}` : ''
  return `第 ${step.stepNo ?? '-'} 道${code}`
}

function applyDefaultStep() {
  const next = currentStep.value ?? routeSteps.value.find((item) => !item.done) ?? routeSteps.value[0]
  scanForm.operId = next?.operId ?? ''
}

async function openScan() {
  Object.assign(scanForm, { orderId: '', sn: '', status: 'OK', operId: '', remark: '' })
  routeSteps.value = []
  manualOverride.value = false
  scanOpen.value = true
  if (orders.value.length === 0) {
    const res = await listScanOrders()
    orders.value = res.data ?? []
  }
}

async function loadRoute(resetManual = true) {
  if (!scanForm.orderId || !scanForm.sn.trim()) {
    routeSteps.value = []
    scanForm.operId = ''
    return
  }
  const seq = ++routeRequestSeq
  routeLoading.value = true
  try {
    const res = await getSnRoute(scanForm.orderId, scanForm.sn.trim())
    if (seq !== routeRequestSeq) return
    routeSteps.value = res.data ?? []
    if (resetManual) manualOverride.value = false
    if (!manualOverride.value || !routeSteps.value.some((item) => item.operId === scanForm.operId)) {
      applyDefaultStep()
    }
  } finally {
    if (seq === routeRequestSeq) routeLoading.value = false
  }
}

function scheduleRouteLoad() {
  if (routeTimer) window.clearTimeout(routeTimer)
  routeTimer = window.setTimeout(() => loadRoute(true), 250)
}

function onSelectOper(value: any) {
  scanForm.operId = String(value || '')
  manualOverride.value = true
}

async function submitScan() {
  if (!scanForm.orderId) return notify.error('请选择工单')
  if (!scanForm.sn.trim()) return notify.error('请输入 SN 序列号')
  if (!scanForm.operId) return notify.error('请选择采集工序')
  scanning.value = true
  try {
    const res = await scanSn({
      orderId: scanForm.orderId,
      sn: scanForm.sn.trim(),
      status: scanForm.status,
      operId: scanForm.operId,
      remark: scanForm.remark,
    })
    notify.success(res.msg || '采集成功')
    load()
    routeSteps.value = res.data?.route ?? []
    manualOverride.value = false
    applyDefaultStep()
    scanForm.remark = ''
    if (res.data?.complete) scanOpen.value = false
  } finally {
    scanning.value = false
  }
}

watch(
  () => scanForm.orderId,
  () => loadRoute(true),
)
watch(
  () => scanForm.sn,
  () => scheduleRouteLoad(),
)

onBeforeUnmount(() => {
  if (routeTimer) window.clearTimeout(routeTimer)
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sp">
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">SN</Label>
        <Input v-model="query.snLike" placeholder="序列号" class="w-44" @keyup.enter="search" />
      </div>
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">工单</Label>
        <Input
          v-model="query.orderCodeLike"
          placeholder="工单编号"
          class="w-40"
          @keyup.enter="search"
        />
      </div>
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">结果</Label>
        <Select
          :model-value="query.status || ALL"
          @update:model-value="query.status = $event && $event !== ALL ? String($event) : undefined"
        >
          <SelectTrigger class="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem :value="ALL">全部</SelectItem>
            <SelectItem value="OK">OK 合格</SelectItem>
            <SelectItem value="NG">NG 不良</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button @click="search"><Search class="h-4 w-4" />查询</Button>
      <Button variant="outline" @click="reset(['snLike', 'orderCodeLike', 'status'])">
        <RotateCcw class="h-4 w-4" />重置
      </Button>
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
        <span class="text-sm font-medium">工序采集记录</span>
        <Button size="sm" @click="openScan"><ScanLine class="h-4 w-4" />工序采集</Button>
      </template>
      <template #status="{ value }">
        <SpStatusBadge :tone="value === 'OK' ? 'success' : 'danger'" :text="value" />
      </template>
      <template #action="{ row }">
        <Button
          variant="ghost"
          size="icon-sm"
          title="SN 追溯"
          @click="router.push(`/wip/trace/${row.sn}`)"
        >
          <Route class="h-4 w-4" />
        </Button>
      </template>
    </SpDataTable>

    <Dialog v-model:open="scanOpen">
      <DialogContent class="max-w-3xl">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <ScanLine class="h-5 w-5 text-primary" />工序采集
          </DialogTitle>
          <DialogDescription>选择工单并扫描 SN，系统自动定位下一道待采集工序。</DialogDescription>
        </DialogHeader>

        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div class="space-y-4">
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="space-y-1.5">
                <Label class="after:ml-0.5 after:text-destructive after:content-['*']">工单</Label>
                <Select v-model="scanForm.orderId">
                  <SelectTrigger><SelectValue placeholder="选择工单" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="o in orders" :key="o.id" :value="o.id!">
                      {{ o.orderCode }} - {{ o.materielDesc || o.materiel }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-1.5">
                <Label class="after:ml-0.5 after:text-destructive after:content-['*']">SN 序列号</Label>
                <Input
                  v-model="scanForm.sn"
                  placeholder="扫描或输入 SN"
                  class="font-mono"
                  @keyup.enter="submitScan"
                />
              </div>
            </div>

            <div class="rounded-md border bg-background px-3 py-2.5 shadow-sm">
              <div class="flex items-center gap-3">
                <div
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-sm font-semibold text-primary"
                >
                  {{ currentStep?.stepNo ?? '-' }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-medium text-muted-foreground">默认工序</span>
                    <span
                      v-if="manualOverride"
                      class="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700"
                    >
                      <SlidersHorizontal class="h-3 w-3" />手动覆盖
                    </span>
                  </div>
                  <div class="mt-0.5 truncate text-base font-semibold leading-6">
                    {{ stepName(currentStep) }}
                  </div>
                  <div class="truncate text-xs text-muted-foreground">{{ stepMeta(currentStep) }}</div>
                </div>
                <div class="shrink-0 text-right">
                  <div class="text-[11px] text-muted-foreground">进度</div>
                  <div class="text-sm font-semibold">{{ doneCount }} / {{ routeSteps.length }}</div>
                </div>
              </div>
              <div class="mt-2 flex gap-1">
                <span
                  v-for="step in routeSteps"
                  :key="step.operId"
                  :class="
                    cn(
                      'h-1 min-w-4 flex-1 rounded-full bg-muted',
                      step.done && 'bg-success',
                      step.current && !step.done && 'bg-primary',
                    )
                  "
                />
              </div>
              <div v-if="routeLoading" class="mt-1 text-right text-[11px] text-muted-foreground">
                路线刷新中...
              </div>
            </div>

            <div class="space-y-1.5">
              <Label>采集工序</Label>
              <Select :model-value="scanForm.operId" @update:model-value="onSelectOper">
                <SelectTrigger>
                  <SelectValue placeholder="先选择工单并输入 SN" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="step in routeSteps" :key="step.operId" :value="step.operId">
                    第 {{ step.stepNo ?? '-' }} 道 · {{ stepName(step) }}
                    <span v-if="step.done">（已完成）</span>
                    <span v-else-if="step.current">（当前）</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div v-if="selectedStep" class="text-xs text-muted-foreground">
                将按 {{ stepMeta(selectedStep) }} 写入采集记录。
              </div>
            </div>

            <div class="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
              <div class="space-y-1.5">
                <Label>判定结果</Label>
                <Select v-model="scanForm.status">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OK">OK 合格</SelectItem>
                    <SelectItem value="NG">NG 不良</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-1.5">
                <Label>备注</Label>
                <Input v-model="scanForm.remark" placeholder="可选" @keyup.enter="submitScan" />
              </div>
            </div>
          </div>

          <div class="rounded-lg border p-3">
            <div class="mb-3 flex items-center justify-between">
              <div>
                <div class="text-sm font-medium">工艺路线</div>
                <div class="text-xs text-muted-foreground">
                  {{ selectedOrder?.orderCode || '未选择工单' }}
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" title="刷新路线" @click="loadRoute(false)">
                <RotateCcw :class="cn('h-4 w-4', routeLoading && 'animate-spin')" />
              </Button>
            </div>

            <div v-if="!routeSteps.length" class="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
              选择工单并输入 SN 后显示工序
            </div>
            <ol v-else class="space-y-2">
              <li
                v-for="step in routeSteps"
                :key="step.operId"
                :class="
                  cn(
                    'flex gap-2 rounded-md border p-2 transition-colors',
                    step.operId === scanForm.operId && 'border-primary bg-primary/5',
                    step.done && 'bg-success/5',
                  )
                "
              >
                <CheckCircle2 v-if="step.done" class="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <AlertTriangle
                  v-else-if="step.current"
                  class="mt-0.5 h-4 w-4 shrink-0 text-primary"
                />
                <Circle v-else class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <button class="min-w-0 flex-1 text-left" type="button" @click="onSelectOper(step.operId)">
                  <span class="block truncate text-sm font-medium">{{ stepName(step) }}</span>
                  <span class="block text-xs text-muted-foreground">{{ stepMeta(step) }}</span>
                </button>
              </li>
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="scanOpen = false">取消</Button>
          <Button :disabled="!canSubmit" @click="submitScan">
            <LoaderCircle v-if="scanning" class="h-4 w-4 animate-spin" />提交采集
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
