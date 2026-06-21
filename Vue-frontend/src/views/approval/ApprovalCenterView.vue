<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  CheckCircle2,
  Eye,
  FileClock,
  Inbox,
  LoaderCircle,
  RotateCcw,
  Search,
  XCircle,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import SpConfirm from '@/components/common/SpConfirm.vue'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { useTable } from '@/composables/useTable'
import {
  completeWorkflowTask,
  getWorkflowTaskSummary,
  pageWorkflowTasks,
  rejectWorkflowTask,
  type WorkflowTaskSummary,
} from '@/api/modules/workflow'
import { getWorkOrderChangeDetail } from '@/api/modules/workOrderChange'
import { notify } from '@/lib/toast'
import {
  getApprovalCenterActions,
  getApprovalCenterBusinessTypeLabel,
  getApprovalCenterStatusLabel,
  getApprovalCenterStatusTone,
  type ApprovalCenterAction,
  type ApprovalCenterStatus,
} from '@/lib/approvalCenter'
import { getWorkOrderChangeStatusMeta } from '@/lib/workOrderChange'
import type { TableColumn } from '@/types/table'
import type { WorkflowTask, WorkOrderChange } from '@/types/domain'

const route = useRoute()
const router = useRouter()
const ALL = 'ALL'

const initialKeyword = typeof route.query.keyword === 'string' ? route.query.keyword : ''
const initialBusinessType = typeof route.query.businessType === 'string' ? route.query.businessType : ''
const activeStatus = ref<ApprovalCenterStatus>('todo')
const summary = ref<WorkflowTaskSummary>({})

const { loading, list, total, query, load, onPageChange, onSizeChange } = useTable<WorkflowTask>(
  pageWorkflowTasks,
  {
    keyword: initialKeyword,
    businessType: initialBusinessType,
    status: activeStatus.value,
  },
)

const statusTabs: Array<{ key: ApprovalCenterStatus; icon: any }> = [
  { key: 'todo', icon: Inbox },
  { key: 'done', icon: CheckCircle2 },
  { key: 'rejected', icon: XCircle },
  { key: 'revoked', icon: FileClock },
]

const businessTypeOptions = [
  { label: '全部流程', value: ALL },
  { label: '生产工单审批', value: 'ORDER_APPROVAL' },
  { label: '工单变更', value: 'WORK_ORDER_CHANGE' },
]

const currentTab = computed(() => statusTabs.find((item) => item.key === activeStatus.value) ?? statusTabs[0])

const columns: TableColumn[] = [
  { key: 'businessCode', title: '业务编号', width: '170px' },
  {
    key: 'formTitle',
    title: '流程标题',
    formatter: (r) => r.formTitle || r.taskName || r.nodeName || '-',
  },
  {
    key: 'businessType',
    title: '业务类型',
    width: '130px',
    formatter: (r) => getApprovalCenterBusinessTypeLabel(r.businessType),
  },
  { key: 'nodeName', title: '当前节点', width: '130px' },
  { key: 'startTime', title: '发起时间', width: '160px' },
  { key: 'completeTime', title: '完成时间', width: '160px' },
  { key: 'opinion', title: '处理意见', width: '160px', formatter: (r) => r.opinion || '-' },
  { key: 'status', title: '状态', slot: 'status', width: '100px', align: 'center' },
  { key: 'action', title: '操作', slot: 'action', width: '140px', align: 'center' },
]

async function loadSummary() {
  const res = await getWorkflowTaskSummary({
    keyword: query.keyword,
    businessType: query.businessType,
  })
  summary.value = res.data ?? {}
}

async function reload() {
  await Promise.all([load(), loadSummary()])
}
useAutoRefresh(reload)

function switchStatus(status: ApprovalCenterStatus) {
  activeStatus.value = status
  query.status = status
  query.current = 1
  void reload()
}

function onSearch() {
  query.current = 1
  void reload()
}

function onReset() {
  query.keyword = ''
  query.businessType = ''
  query.current = 1
  void reload()
}

function tabCount(status: ApprovalCenterStatus) {
  return Number(summary.value?.[status] ?? 0)
}

const approveOpen = ref(false)
const approveTarget = ref<WorkflowTask | null>(null)
const approving = ref(false)
function askApprove(row: WorkflowTask) {
  approveTarget.value = row
  approveOpen.value = true
}
async function onApprove() {
  if (!approveTarget.value?.id) return
  approving.value = true
  try {
    await completeWorkflowTask(approveTarget.value.id, '同意')
    notify.success('审批已通过')
    approveOpen.value = false
    await reload()
  } finally {
    approving.value = false
  }
}

const rejectOpen = ref(false)
const rejectTarget = ref<WorkflowTask | null>(null)
const rejectOpinion = ref('')
const rejecting = ref(false)
function askReject(row: WorkflowTask) {
  rejectTarget.value = row
  rejectOpinion.value = ''
  rejectOpen.value = true
}
async function onReject() {
  if (!rejectTarget.value?.id) return
  rejecting.value = true
  try {
    await rejectWorkflowTask(rejectTarget.value.id, rejectOpinion.value.trim() || '审批驳回')
    notify.success('审批已驳回')
    rejectOpen.value = false
    await reload()
  } finally {
    rejecting.value = false
  }
}

const changeOpen = ref(false)
const changeLoading = ref(false)
const currentChange = ref<WorkOrderChange | null>(null)
async function openWorkOrderChange(row: WorkflowTask) {
  if (!row.businessId) return
  changeOpen.value = true
  changeLoading.value = true
  currentChange.value = null
  try {
    const res = await getWorkOrderChangeDetail(row.businessId)
    currentChange.value = res.data ?? null
  } finally {
    changeLoading.value = false
  }
}

function viewTask(row: WorkflowTask) {
  if (row.businessType === 'ORDER_APPROVAL' && row.businessId) {
    router.push(`/production/order/${row.businessId}?from=approval`)
    return
  }
  if (row.businessType === 'WORK_ORDER_CHANGE') {
    void openWorkOrderChange(row)
  }
}

function runRowAction(action: ApprovalCenterAction, row: WorkflowTask) {
  if (action.key === 'approve') {
    askApprove(row)
    return
  }
  if (action.key === 'reject') {
    askReject(row)
    return
  }
  viewTask(row)
}

function changeStatusText(change?: WorkOrderChange | null) {
  return getWorkOrderChangeStatusMeta(change?.status).label
}
function changeStatusTone(change?: WorkOrderChange | null) {
  return getWorkOrderChangeStatusMeta(change?.status).tone
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <button
        v-for="tab in statusTabs"
        :key="tab.key"
        type="button"
        :class="[
          'flex items-center justify-between rounded-lg border bg-card p-4 text-left shadow-sp transition-colors hover:bg-accent/50',
          activeStatus === tab.key && 'border-primary bg-primary/5 ring-1 ring-primary/20',
        ]"
        @click="switchStatus(tab.key)"
      >
        <div class="space-y-1">
          <div class="text-sm text-muted-foreground">{{ getApprovalCenterStatusLabel(tab.key) }}</div>
          <div class="text-2xl font-bold tabular-nums">{{ tabCount(tab.key) }}</div>
        </div>
        <component
          :is="tab.icon"
          :class="[
            'h-6 w-6',
            activeStatus === tab.key ? 'text-primary' : 'text-muted-foreground',
          ]"
        />
      </button>
    </div>

    <div class="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sp">
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">关键字</Label>
        <Input
          v-model="query.keyword"
          placeholder="业务编号 / 标题 / 节点"
          class="w-56"
          @keyup.enter="onSearch"
        />
      </div>
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">业务类型</Label>
        <Select
          :model-value="query.businessType || ALL"
          @update:model-value="query.businessType = $event && $event !== ALL ? String($event) : ''"
        >
          <SelectTrigger class="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem v-for="item in businessTypeOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button @click="onSearch"><Search class="h-4 w-4" />查询</Button>
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
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm font-medium">统一审批中心</span>
          <SpStatusBadge
            :tone="getApprovalCenterStatusTone(currentTab.key)"
            :text="getApprovalCenterStatusLabel(currentTab.key)"
          />
          <span class="text-xs text-muted-foreground">生产工单审批与工单变更审批统一办理</span>
        </div>
      </template>
      <template #status="{ value }">
        <SpStatusBadge :tone="getApprovalCenterStatusTone(value)" :text="getApprovalCenterStatusLabel(value)" />
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
      v-model:open="approveOpen"
      title="审批通过"
      :description="`确定通过「${approveTarget?.businessCode ?? ''}」吗？通过后将触发对应业务生效。`"
      @confirm="onApprove"
    />

    <Dialog v-model:open="rejectOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>驳回审批</DialogTitle>
          <DialogDescription>
            驳回「{{ rejectTarget?.businessCode ?? '' }}」，请填写处理意见。
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-1">
          <Label class="text-xs text-muted-foreground">驳回意见</Label>
          <Textarea v-model="rejectOpinion" placeholder="请说明驳回原因" :rows="3" />
        </div>
        <DialogFooter>
          <Button variant="outline" :disabled="rejecting" @click="rejectOpen = false">取消</Button>
          <Button variant="destructive" :disabled="rejecting" @click="onReject">
            <LoaderCircle v-if="rejecting" class="h-4 w-4 animate-spin" />确认驳回
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="changeOpen">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>工单变更审批详情</DialogTitle>
          <DialogDescription>审批通过后，变更内容会自动写回已下发工单。</DialogDescription>
        </DialogHeader>
        <div v-if="changeLoading" class="py-8 text-center text-sm text-muted-foreground">加载中...</div>
        <div v-else-if="currentChange" class="space-y-4 text-sm">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-medium">{{ currentChange.workOrderCode }}</span>
            <SpStatusBadge :tone="changeStatusTone(currentChange)" :text="changeStatusText(currentChange)" />
            <Button
              v-if="currentChange.workOrderId"
              variant="outline"
              size="sm"
              class="ml-auto"
              @click="router.push(`/production/order/${currentChange?.workOrderId}`)"
            >
              查看工单
            </Button>
          </div>
          <div class="grid grid-cols-[120px_1fr_1fr] gap-2 rounded-lg border p-3">
            <div class="text-muted-foreground">字段</div>
            <div class="text-muted-foreground">变更前</div>
            <div class="text-muted-foreground">变更后</div>
            <div class="text-muted-foreground">数量</div>
            <div>{{ currentChange.beforeQty ?? '-' }}</div>
            <div class="font-medium text-primary">{{ currentChange.afterQty ?? '-' }}</div>
            <div class="text-muted-foreground">计划开始</div>
            <div>{{ currentChange.beforePlanStartTime || '-' }}</div>
            <div class="font-medium text-primary">{{ currentChange.afterPlanStartTime || '-' }}</div>
            <div class="text-muted-foreground">计划结束</div>
            <div>{{ currentChange.beforePlanEndTime || '-' }}</div>
            <div class="font-medium text-primary">{{ currentChange.afterPlanEndTime || '-' }}</div>
            <div class="text-muted-foreground">备注</div>
            <div>{{ currentChange.beforeRemark || '-' }}</div>
            <div class="font-medium text-primary">{{ currentChange.afterRemark || '-' }}</div>
          </div>
        </div>
        <div v-else class="py-8 text-center text-sm text-muted-foreground">变更记录不存在</div>
      </DialogContent>
    </Dialog>
  </div>
</template>
