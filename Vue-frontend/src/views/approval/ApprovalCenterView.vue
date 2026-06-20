<script setup lang="ts">
import { onMounted, ref } from 'vue'
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
import type { TableColumn } from '@/types/table'
import type { Order } from '@/types/domain'

defineOptions({ name: 'ApprovalCenter' })

const router = useRouter()
const { loading, list, total, query, load, onPageChange, onSizeChange, search, reset } =
  useTable<Order>(pageOrders, { orderCodeLike: '', materielDescLike: '', statue: 1 })
onMounted(load)

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
  reset(['orderCodeLike', 'materielDescLike'])
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
          <div class="text-sm text-muted-foreground">待我审批</div>
          <div class="text-2xl font-bold tabular-nums leading-tight">{{ total }}</div>
        </div>
      </div>
      <p class="hidden max-w-md text-right text-xs text-muted-foreground sm:block">
        生产订单下达后生成的待审批工单集中在此处理；通过后进入派工与下发，驳回后工单终结。
      </p>
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
        <span class="text-sm font-medium">审批中心</span>
        <SpStatusBadge tone="warning" text="待审批" />
      </template>
      <template #action="{ row }">
        <div class="flex items-center justify-center gap-1">
          <Button variant="ghost" size="icon-sm" title="查看详情" @click="goDetail(row)">
            <Eye class="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="审批通过" @click="askApprove(row)">
            <CheckCircle2 class="h-4 w-4 text-success" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="驳回" @click="askReject(row)">
            <XCircle class="h-4 w-4 text-destructive" />
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
