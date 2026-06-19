<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, RotateCcw, ScanLine, Route, LoaderCircle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { pageSnRecords, listScanOrders, scanSn } from '@/api/modules/wip'
import { notify } from '@/lib/toast'
import type { TableColumn } from '@/types/table'
import type { SnRecord, Order } from '@/types/domain'

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

// 采集弹窗
const scanOpen = ref(false)
const scanning = ref(false)
const orders = ref<Order[]>([])
const scanForm = reactive({ orderId: '', sn: '', status: 'OK', remark: '' })
async function openScan() {
  Object.assign(scanForm, { orderId: '', sn: '', status: 'OK', remark: '' })
  scanOpen.value = true
  if (orders.value.length === 0) {
    const res = await listScanOrders()
    orders.value = res.data ?? []
  }
}
async function submitScan() {
  if (!scanForm.orderId) return notify.error('请选择工单')
  if (!scanForm.sn.trim()) return notify.error('请输入 SN 序列号')
  scanning.value = true
  try {
    await scanSn({ ...scanForm, sn: scanForm.sn.trim() })
    notify.success('采集成功')
    scanOpen.value = false
    load()
  } finally {
    scanning.value = false
  }
}
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
        <Input v-model="query.orderCodeLike" placeholder="工单编号" class="w-40" @keyup.enter="search" />
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
        <Button variant="ghost" size="icon-sm" title="SN 追溯" @click="router.push(`/wip/trace/${row.sn}`)">
          <Route class="h-4 w-4" />
        </Button>
      </template>
    </SpDataTable>

    <!-- 采集弹窗 -->
    <Dialog v-model:open="scanOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>工序采集</DialogTitle>
          <DialogDescription>选择工单并扫描 SN，记录当前工序的合格判定</DialogDescription>
        </DialogHeader>
        <div class="space-y-3">
          <div class="space-y-1.5">
            <Label class="after:ml-0.5 after:text-destructive after:content-['*']">工单</Label>
            <Select v-model="scanForm.orderId">
              <SelectTrigger><SelectValue placeholder="选择工单" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="o in orders" :key="o.id" :value="o.id!">
                  {{ o.orderCode }} - {{ o.materielDesc }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1.5">
            <Label class="after:ml-0.5 after:text-destructive after:content-['*']">SN 序列号</Label>
            <Input v-model="scanForm.sn" placeholder="扫描或输入 SN" @keyup.enter="submitScan" />
          </div>
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
            <Input v-model="scanForm.remark" placeholder="可选" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="scanOpen = false">取消</Button>
          <Button :disabled="scanning" @click="submitScan">
            <LoaderCircle v-if="scanning" class="h-4 w-4 animate-spin" />提交采集
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
