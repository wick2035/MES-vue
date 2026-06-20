<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, RotateCcw, Eye, CheckCircle2, XCircle, Inbox, LoaderCircle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import SpConfirm from '@/components/common/SpConfirm.vue'
import { useTable } from '@/composables/useTable'
import { pageOrders, approveOrder, rejectOrder } from '@/api/modules/order'
import { notify } from '@/lib/toast'
import {
  getApprovalCenterActions,
  getApprovalCenterStatue,
  type ApprovalCenterStatus,
  type ApprovalCenterAction,
} from '@/lib/approvalCenter'
import type { TableColumn } from '@/types/table'
import type { Order } from '@/types/domain'

defineOptions({ name: 'ApprovalCenter' })

const router = useRouter()
const { loading, list, total, query, load, onPageChange, onSizeChange, search } =
  useTable<Order>(pageOrders, {
    orderCodeLike: '',
    materielDescLike: '',
    statue: getApprovalCenterStatue('todo'),
  })
onMounted(load)

const activeStatus = ref<ApprovalCenterStatus>('todo')
const statusTabs: Array<{
  key: ApprovalCenterStatus
  label: string
  summaryLabel: string
  tableTitle: string
  badge: string
  tone: 'warning' | 'success'
}> = [
  {
    key: 'todo',
    label: '待审批',
    summaryLabel: '待我审批',
    tableTitle: '审批中心',
    badge: '待审批',
    tone: 'warning',
  },
  {
    key: 'approved',
    label: '已通过',
    summaryLabel: '已通过审批',
    tableTitle: '审批记录',
    badge: '已通过',
    tone: 'success',
  },
]
const currentStatus = computed(
  () => statusTabs.find((item) => item.key === activeStatus.value) ?? statusTabs[0],
)

const columns: TableColumn[] = [
  { key: 'orderCode', title: '工单编号', width: '180px' },
  { key: 'materielDesc', title: '产品物料' },
  { key: 'qty', title: '数量', width: '80px', align: 'right' },
  {
    key: 'sourceOrderNo',
    title: '来源生产订单',
    width: '170px',
    formatter: (r) => r.sourceOrderNo || '—',
  },
  { key: 'designerName', title: '提交人', width: '110px', formatter: (r) => r.designerName || '—' },
  { key: 'createTime', title: '提交时间', width: '160px' },
  { key: 'action', title: '审批操作', slot: 'action', width: '170px', align: 'center' },
]

function goDetail(row: Order) {
  router.push(`/production/order/${row.id}`)
}

function switchStatus(status: ApprovalCenterStatus) {
  activeStatus.value = status
  query.statue = getApprovalCenterStatue(status)
  query.current = 1
  load()
}

function runRowAction(action: ApprovalCenterAction, row: Order) {
  if (action.key === 'approve') {
    askApprove(row)
    return
  }
  if (action.key === 'reject') {
    askReject(row)
    return
  }
  goDetail(row)
}

// 通过
const confirmOpen = ref(false)
const approveTarget = ref<Order | null>(null)
function askApprove(row: Order) {
  approveTarget.value = row
  confirmOpen.value = true
}
async function onApprove() {
  if (!approveTarget.value?.id) return
  await approveOrder(approveTarget.value.id)
  notify.success('审批通过')
  confirmOpen.value = false
  load()
}

// 驳回
const rejectOpen = ref(false)
const rejectTarget = ref<Order | null>(null)
const rejectOpinion = ref('')
const rejecting = ref(false)
function askReject(row: Order) {
  rejectTarget.value = row
  rejectOpinion.value = ''
  rejectOpen.value = true
}
async function onReject() {
  if (!rejectTarget.value?.id) return
  rejecting.value = true
  try {
    await rejectOrder(rejectTarget.value.id, rejectOpinion.value.trim() || '审批驳回')
    notify.success('已驳回')
    rejectOpen.value = false
    load()
  } finally {
    rejecting.value = false
  }
}

function onReset() {
  query.orderCodeLike = undefined
  query.materielDescLike = undefined
  query.statue = getApprovalCenterStatue(activeStatus.value)
  query.current = 1
  load()
}
</script>

<template>
  <div class="space-y-4">
    <!-- 头部统计带 -->
    <div
      class="flex items-center justify-between rounded-2xl border border-warning/20 bg-gradient-to-r from-warning/10 to-amber-50 px-5 py-4 shadow-sp"
    >
      <div class="flex items-center gap-3">
        <div
          class="flex h-11 w-11 items-center justify-center rounded-xl bg-warning/15 text-warning"
        >
          <Inbox class="h-6 w-6" />
        </div>
        <div>
          <div class="text-sm text-muted-foreground">{{ currentStatus.summaryLabel }}</div>
          <div class="text-2xl font-bold tabular-nums leading-tight">{{ total }}</div>
        </div>
      </div>
      <p class="hidden max-w-md text-right text-xs text-muted-foreground sm:block">
        生产订单下达后生成的待审批工单集中在此处理；通过后进入派工与下发，驳回后工单终结。
      </p>
    </div>

    <div class="flex items-center gap-2 rounded-lg border bg-card p-1 shadow-sp">
      <Button
        v-for="tab in statusTabs"
        :key="tab.key"
        :variant="activeStatus === tab.key ? 'default' : 'ghost'"
        class="h-9 flex-1 justify-center sm:flex-none sm:px-5"
        @click="switchStatus(tab.key)"
      >
        <component :is="tab.key === 'approved' ? CheckCircle2 : Inbox" class="h-4 w-4" />
        {{ tab.label }}
      </Button>
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
        <Label class="text-xs text-muted-foreground">产品物料</Label>
        <Input
          v-model="query.materielDescLike"
          placeholder="物料名称"
          class="w-40"
          @keyup.enter="search"
        />
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
        <span class="text-sm font-medium">{{ currentStatus.tableTitle }}</span>
        <SpStatusBadge :tone="currentStatus.tone" :text="currentStatus.badge" />
      </template>
      <template #action="{ row }">
        <div class="flex items-center justify-center gap-1">
          <Button
            v-for="action in getApprovalCenterActions(row)"
            :key="action.key"
            variant="ghost"
            size="icon-sm"
            :title="action.title"
            @click="runRowAction(action, row)"
          >
            <Eye v-if="action.key === 'view'" class="h-4 w-4" />
            <CheckCircle2 v-else-if="action.key === 'approve'" class="h-4 w-4 text-success" />
            <XCircle v-else class="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </template>
    </SpDataTable>

    <SpConfirm
      v-model:open="confirmOpen"
      title="审批通过"
      :description="`确定审批通过工单「${approveTarget?.orderCode ?? ''}」吗？`"
      @confirm="onApprove"
    />

    <!-- 驳回弹窗 -->
    <Dialog v-model:open="rejectOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>驳回工单</DialogTitle>
          <DialogDescription>
            驳回工单「{{ rejectTarget?.orderCode ?? '' }}」，请填写驳回意见。
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-1">
          <Label class="text-xs text-muted-foreground">驳回意见</Label>
          <Textarea v-model="rejectOpinion" placeholder="请说明驳回原因…" :rows="3" />
        </div>
        <DialogFooter>
          <Button variant="outline" :disabled="rejecting" @click="rejectOpen = false">取消</Button>
          <Button variant="destructive" :disabled="rejecting" @click="onReject">
            <LoaderCircle v-if="rejecting" class="h-4 w-4 animate-spin" />确认驳回
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
