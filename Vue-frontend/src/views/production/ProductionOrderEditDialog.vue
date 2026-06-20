<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Plus, Trash2, LoaderCircle } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { notify } from '@/lib/toast'
import {
  getProductionOrderItems,
  saveProductionOrder,
  submitProductionOrder,
} from '@/api/modules/productionOrder'
import type { ProductionOrder, ProductionOrderItem } from '@/types/domain'

const props = defineProps<{ open: boolean; order: ProductionOrder | null }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'saved'): void }>()

const today = new Date().toISOString().slice(0, 10)
const header = reactive<ProductionOrder>({})
const items = ref<ProductionOrderItem[]>([])
const saving = ref(false)
const isEdit = ref(false)

function blankItem(): ProductionOrderItem {
  return { productMateriel: '', productName: '', qty: 1, planDeliveryDate: '', planStartDate: '' }
}

function resetHeader(o?: ProductionOrder | null) {
  Object.keys(header).forEach((k) => delete (header as Record<string, unknown>)[k])
  Object.assign(header, {
    sourceType: 'DEMAND',
    customerName: '',
    businessType: '普通销售',
    orderDate: today,
    schedulingMethod: 'REVERSE',
    remark: '',
    ...(o ?? {}),
  })
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    isEdit.value = !!props.order?.id
    resetHeader(props.order)
    if (props.order?.id) {
      const res = await getProductionOrderItems(props.order.id)
      items.value = (res.data ?? []).map((it) => ({ ...it }))
      if (items.value.length === 0) items.value = [blankItem()]
    } else {
      items.value = [blankItem()]
    }
  },
)

function addItem() {
  items.value.push(blankItem())
}
function removeItem(i: number) {
  items.value.splice(i, 1)
  if (items.value.length === 0) items.value.push(blankItem())
}

function validate(): boolean {
  if (header.sourceType === 'DEMAND' && !header.customerName?.trim()) {
    notify.error('需求订单必须填写客户名称')
    return false
  }
  if (items.value.length === 0) {
    notify.error('请至少维护一条产品明细')
    return false
  }
  for (const it of items.value) {
    if (!it.productMateriel?.trim()) {
      notify.error('请填写产品物料编码（需已维护最新定版 BOM）')
      return false
    }
    if (!it.qty || it.qty <= 0) {
      notify.error('订单数量必须大于 0')
      return false
    }
    if (header.schedulingMethod === 'REVERSE' && !it.planDeliveryDate) {
      notify.error('逆向排产必须填写计划交付日期')
      return false
    }
    if (header.schedulingMethod === 'FORWARD' && !it.planStartDate) {
      notify.error('正向排产必须填写计划开工日期')
      return false
    }
  }
  return true
}

async function doSave(submit: boolean) {
  if (!validate()) return
  saving.value = true
  try {
    const payload = { order: { ...header }, items: items.value }
    if (submit) {
      await submitProductionOrder(payload)
      notify.success('已提交生产主管审批并生成生产工单')
    } else {
      await saveProductionOrder(payload)
      notify.success(isEdit.value ? '已保存修改' : '已保存草稿')
    }
    emit('update:open', false)
    emit('saved')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[88vh] max-w-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{ isEdit ? '编辑生产订单' : '新建生产订单' }}</DialogTitle>
        <DialogDescription>
          维护订单头与产品明细。产品物料须已配置最新定版 BOM 与工艺路线，方可提交生成工单。
        </DialogDescription>
      </DialogHeader>

      <!-- 订单头 -->
      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1">
          <Label class="text-xs text-muted-foreground">订单来源</Label>
          <Select
            :model-value="header.sourceType"
            @update:model-value="header.sourceType = String($event)"
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DEMAND">需求订单</SelectItem>
              <SelectItem value="FORECAST">预测订单</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1">
          <Label class="text-xs text-muted-foreground">排产方式</Label>
          <Select
            :model-value="header.schedulingMethod"
            @update:model-value="header.schedulingMethod = String($event)"
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="REVERSE">逆向排产（按交付期）</SelectItem>
              <SelectItem value="FORWARD">正向排产（按开工期）</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1">
          <Label class="text-xs text-muted-foreground">
            客户名称<span v-if="header.sourceType === 'DEMAND'" class="text-destructive">*</span>
          </Label>
          <Input v-model="header.customerName" placeholder="客户名称" />
        </div>
        <div class="space-y-1">
          <Label class="text-xs text-muted-foreground">业务类型</Label>
          <Input v-model="header.businessType" placeholder="如 普通销售" />
        </div>
        <div class="space-y-1">
          <Label class="text-xs text-muted-foreground">下单日期</Label>
          <DatePicker v-model="header.orderDate" />
        </div>
        <div class="space-y-1">
          <Label class="text-xs text-muted-foreground">备注</Label>
          <Input v-model="header.remark" placeholder="备注" />
        </div>
      </div>

      <!-- 明细 -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium">产品明细</span>
          <Button size="sm" variant="outline" @click="addItem"
            ><Plus class="h-4 w-4" />新增明细行</Button
          >
        </div>
        <div class="overflow-x-auto rounded-lg border">
          <table class="w-full text-sm">
            <thead class="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th class="px-2 py-2 text-left font-medium">产品物料编码 *</th>
                <th class="px-2 py-2 text-left font-medium">产品名称</th>
                <th class="w-24 px-2 py-2 text-right font-medium">数量 *</th>
                <th class="w-40 px-2 py-2 text-left font-medium">
                  {{ header.schedulingMethod === 'FORWARD' ? '计划开工日期 *' : '计划交付日期 *' }}
                </th>
                <th class="w-12 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="(it, i) in items" :key="i" class="border-t">
                <td class="px-2 py-1.5">
                  <Input v-model="it.productMateriel" placeholder="物料编码" class="h-8" />
                </td>
                <td class="px-2 py-1.5">
                  <Input v-model="it.productName" placeholder="（保存后按 BOM 回填）" class="h-8" />
                </td>
                <td class="px-2 py-1.5">
                  <Input v-model.number="it.qty" type="number" min="1" class="h-8 text-right" />
                </td>
                <td class="px-2 py-1.5">
                  <DatePicker
                    v-if="header.schedulingMethod === 'FORWARD'"
                    v-model="it.planStartDate"
                    class="h-8"
                  />
                  <DatePicker v-else v-model="it.planDeliveryDate" class="h-8" />
                </td>
                <td class="px-2 py-1.5 text-center">
                  <Button variant="ghost" size="icon-sm" title="删除" @click="removeItem(i)">
                    <Trash2 class="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="saving" @click="emit('update:open', false)"
          >取消</Button
        >
        <Button variant="outline" :disabled="saving" @click="doSave(false)">
          <LoaderCircle v-if="saving" class="h-4 w-4 animate-spin" />保存草稿
        </Button>
        <Button :disabled="saving" @click="doSave(true)">
          <LoaderCircle v-if="saving" class="h-4 w-4 animate-spin" />保存并提交审批
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
