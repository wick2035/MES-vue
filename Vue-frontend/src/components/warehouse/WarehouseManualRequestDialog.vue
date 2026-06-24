<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ArrowDownToLine, ArrowUpFromLine, LoaderCircle } from 'lucide-vue-next'
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
import { SpCombobox, type ComboboxOption } from '@/components/ui/combobox'
import { pageMaterials } from '@/api/modules/material'
import {
  applyWarehouseRequest,
  availableLocations,
  pageWarehouses,
  type AvailableLocation,
} from '@/api/modules/warehouse'
import { notify } from '@/lib/toast'
import type { Inventory, Material, Warehouse } from '@/types/domain'

type Direction = 'IN' | 'OUT'

const props = defineProps<{
  open: boolean
  direction: Direction
  initial?: Partial<Inventory> | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'saved'): void
}>()

const warehouses = ref<Warehouse[]>([])
const materials = ref<Material[]>([])
const locations = ref<AvailableLocation[]>([])
const loadingOptions = ref(false)
const loadingLocations = ref(false)
const submitting = ref(false)
const errors = reactive<Record<string, string>>({})
const form = reactive({
  warehouseId: '',
  materialId: '',
  locationId: '',
  batchNo: '',
  qty: null as number | null,
  remark: '',
})

const isInbound = computed(() => props.direction === 'IN')
const title = computed(() => (isInbound.value ? '新建手工入库' : '新建手工出库'))
const description = computed(() =>
  isInbound.value
    ? '选择已有物料档案、库房与兼容库位，提交后到仓储中心确认入库。'
    : '选择库存物料与库位，提交后到仓储中心确认出库并生成台账。',
)

const warehouseOptions = computed<ComboboxOption[]>(() =>
  warehouses.value.map((w) => ({
    value: w.id || '',
    label: w.warehouseName || w.warehouseCode || '',
    description: w.warehouseCode,
  })),
)
const materialOptions = computed<ComboboxOption[]>(() =>
  materials.value.map((m) => ({
    value: m.id || '',
    label: m.materielDesc || m.materiel || '',
    description: [m.materiel, m.unit].filter(Boolean).join(' / '),
  })),
)
const locationOptions = computed<ComboboxOption[]>(() =>
  locations.value.map((loc) => ({
    value: loc.id,
    label: loc.locationCode || loc.id,
    description: isInbound.value
      ? loc.empty
        ? '空库位'
        : `同物料库存 ${formatQty(loc.qty)}`
      : `可出库 ${formatQty(loc.qty)}${loc.materialCode ? ` / ${loc.materialCode}` : ''}`,
  })),
)
const selectedMaterial = computed(() => materials.value.find((m) => m.id === form.materialId))
const selectedLocation = computed(() => locations.value.find((loc) => loc.id === form.locationId))
const maxOutboundQty = computed(() => {
  if (isInbound.value) return 0
  const fromInitial = Number(props.initial?.qty || 0)
  const fromLocation = Number(selectedLocation.value?.qty || 0)
  return fromInitial > 0 ? fromInitial : fromLocation
})

function formatQty(value?: number) {
  return Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 4 })
}

function resetForm() {
  Object.assign(form, {
    warehouseId: props.initial?.warehouseId || '',
    materialId: props.initial?.materielId || '',
    locationId: props.initial?.locationId || '',
    batchNo: props.initial?.batchNo || '',
    qty: props.direction === 'OUT' && props.initial?.qty ? Number(props.initial.qty) : null,
    remark: props.direction === 'OUT' ? '库存列表手工出库' : '',
  })
  Object.keys(errors).forEach((key) => delete errors[key])
}

async function loadBaseOptions() {
  loadingOptions.value = true
  try {
    const [warehouseRes, materialRes] = await Promise.all([
      pageWarehouses({ current: 1, size: 300, orderBy: 'warehouse_code' }),
      pageMaterials({ current: 1, size: 500 }),
    ])
    warehouses.value = warehouseRes.data?.records ?? []
    materials.value = materialRes.data?.records ?? []
  } finally {
    loadingOptions.value = false
  }
}

let locationSeq = 0
async function loadLocations() {
  const seq = ++locationSeq
  if (!props.open || !form.warehouseId || !form.materialId) {
    locations.value = []
    if (!props.initial?.locationId) form.locationId = ''
    return
  }
  loadingLocations.value = true
  try {
    const res = await availableLocations({
      warehouseId: form.warehouseId,
      materialId: form.materialId,
      direction: props.direction,
    })
    if (seq !== locationSeq) return
    locations.value = res.data ?? []
    if (form.locationId && !locations.value.some((loc) => loc.id === form.locationId)) {
      form.locationId = ''
    }
  } finally {
    if (seq === locationSeq) loadingLocations.value = false
  }
}

function onWarehouseChange(value: string | string[]) {
  form.warehouseId = String(value || '')
  form.locationId = ''
}

function onMaterialChange(value: string | string[]) {
  form.materialId = String(value || '')
  form.locationId = ''
}

function onQtyChange(value: string | number) {
  form.qty = value === '' || value === null ? null : Number(value)
}

function validate() {
  Object.keys(errors).forEach((key) => delete errors[key])
  const qty = Number(form.qty)
  if (!form.warehouseId) errors.warehouseId = '请选择库房'
  if (!form.materialId) errors.materialId = '请选择物料'
  if (!form.locationId) errors.locationId = '请选择库位'
  if (!Number.isFinite(qty) || qty <= 0) errors.qty = '请输入大于 0 的数量'
  if (!isInbound.value && maxOutboundQty.value > 0 && qty > maxOutboundQty.value) {
    errors.qty = `出库数量不能超过 ${formatQty(maxOutboundQty.value)}`
  }
  return Object.keys(errors).length === 0
}

async function submit() {
  if (!validate()) return
  submitting.value = true
  try {
    await applyWarehouseRequest({
      businessType: isInbound.value ? 'MANUAL_IN' : 'MANUAL_OUT',
      warehouseId: form.warehouseId,
      locationId: form.locationId,
      materialId: form.materialId,
      batchNo: form.batchNo,
      qty: Number(form.qty),
      remark: form.remark,
    })
    notify.success(`${isInbound.value ? '入库' : '出库'}申请已提交，请到仓储中心确认`)
    emit('update:open', false)
    emit('saved')
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    resetForm()
    if (!warehouses.value.length || !materials.value.length) {
      await loadBaseOptions()
    }
    await loadLocations()
  },
)

watch(
  () => [form.warehouseId, form.materialId, props.direction],
  () => loadLocations(),
)
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[88vh] max-w-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <span
            class="flex h-8 w-8 items-center justify-center rounded-md"
            :class="isInbound ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'"
          >
            <ArrowDownToLine v-if="isInbound" class="h-4 w-4" />
            <ArrowUpFromLine v-else class="h-4 w-4" />
          </span>
          {{ title }}
        </DialogTitle>
        <DialogDescription>{{ description }}</DialogDescription>
      </DialogHeader>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="space-y-1.5">
          <Label class="after:ml-0.5 after:text-destructive after:content-['*']">库房</Label>
          <SpCombobox
            :model-value="form.warehouseId"
            :options="warehouseOptions"
            :disabled="loadingOptions || !!initial?.warehouseId"
            placeholder="选择库房"
            search-placeholder="搜索库房"
            @update:model-value="onWarehouseChange"
          />
          <p v-if="errors.warehouseId" class="text-xs text-destructive">{{ errors.warehouseId }}</p>
        </div>

        <div class="space-y-1.5">
          <Label class="after:ml-0.5 after:text-destructive after:content-['*']">物料</Label>
          <SpCombobox
            :model-value="form.materialId"
            :options="materialOptions"
            :disabled="loadingOptions || !!initial?.materielId"
            placeholder="选择已有物料"
            search-placeholder="搜索物料编码/名称"
            @update:model-value="onMaterialChange"
          />
          <p v-if="errors.materialId" class="text-xs text-destructive">{{ errors.materialId }}</p>
        </div>

        <div class="space-y-1.5">
          <Label class="after:ml-0.5 after:text-destructive after:content-['*']">库位</Label>
          <SpCombobox
            v-model="form.locationId"
            :options="locationOptions"
            :disabled="loadingLocations || !form.warehouseId || !form.materialId || !!initial?.locationId"
            :placeholder="loadingLocations ? '正在匹配库位' : '选择可用库位'"
            search-placeholder="搜索库位"
            :empty-text="isInbound ? '没有空库位或同物料库位' : '没有可出库库位'"
          />
          <p v-if="errors.locationId" class="text-xs text-destructive">{{ errors.locationId }}</p>
        </div>

        <div class="space-y-1.5">
          <Label>批号</Label>
          <Input v-model="form.batchNo" placeholder="可选，留空按无批次处理" />
        </div>

        <div class="space-y-1.5">
          <Label class="after:ml-0.5 after:text-destructive after:content-['*']">数量</Label>
          <Input
            :model-value="form.qty ?? ''"
            type="number"
            min="0.0001"
            step="0.0001"
            placeholder="输入数量"
            @update:model-value="onQtyChange"
          />
          <p v-if="!isInbound && maxOutboundQty" class="text-xs text-muted-foreground">
            当前可出库 {{ formatQty(maxOutboundQty) }} {{ selectedMaterial?.unit || '' }}
          </p>
          <p v-if="errors.qty" class="text-xs text-destructive">{{ errors.qty }}</p>
        </div>

        <div class="space-y-1.5 sm:col-span-2">
          <Label>备注</Label>
          <Textarea v-model="form.remark" placeholder="记录供应到货、领用原因或操作说明" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button :disabled="submitting || loadingOptions" @click="submit">
          <LoaderCircle v-if="submitting" class="h-4 w-4 animate-spin" />
          提交申请
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
