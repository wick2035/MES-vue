<script setup lang="ts">
import { computed, ref } from 'vue'
import { LoaderCircle, MousePointerClick, PackageSearch } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { Textarea } from '@/components/ui/textarea'
import SpPickerDialog from '@/components/common/SpPickerDialog.vue'
import { pageMaterials } from '@/api/modules/material'
import { listSelectableComponents } from '@/api/modules/technology'
import { makeClientFetcher, type PickerFetcher } from '@/lib/picker'
import { notify } from '@/lib/toast'
import { BOM_LEVEL_OPTIONS, isProductBom } from './constants'
import type { TableColumn } from '@/types/table'

const props = defineProps<{ open: boolean; model: Record<string, any>; loading?: boolean }>()
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'submit'): void
}>()

const isEdit = computed(() => !!props.model.id)
const title = computed(() => (isEdit.value ? '编辑 BOM 头' : '新建 BOM'))
const isProduct = computed(() => isProductBom(props.model.bomLevel))

function onLevelChange(val: any) {
  props.model.bomLevel = val === '' || val == null ? null : Number(val)
  // 层级变化后来源不同，清空已选物料/零部件
  props.model.materielCode = ''
  props.model.materielDesc = ''
}

// --- 物料 / 零部件选择器 ---
const pickerOpen = ref(false)
const materialColumns: TableColumn[] = [
  { key: 'materiel', title: '物料编码', width: '160px' },
  { key: 'materielDesc', title: '名称' },
  { key: 'matType', title: '类型', width: '90px', align: 'center' },
  { key: 'unit', title: '单位', width: '80px', align: 'center' },
]
const componentColumns: TableColumn[] = [
  { key: 'componentCode', title: '零部件编码', width: '160px' },
  { key: 'componentName', title: '名称' },
  { key: 'componentType', title: '类型', width: '90px', align: 'center' },
]

const pickerTitle = computed(() => (isProduct.value ? '选择产品物料' : '选择零部件'))
const pickerColumns = computed(() => (isProduct.value ? materialColumns : componentColumns))
const pickerEmptyHint = computed(() =>
  isProduct.value ? '没有成品/产品物料，请先到物料档案维护' : '没有可用零部件，请先到零部件定义维护',
)

const pickerFetcher = computed<PickerFetcher>(() => {
  if (isProduct.value) {
    return async ({ keyword, page, size }) => {
      const res = await pageMaterials({
        current: page,
        size,
        materielLike: keyword,
        matTypes: 'FG,PRODUCT',
      })
      return { records: res.data?.records ?? [], total: res.data?.total ?? 0 }
    }
  }
  const type = Number(props.model.bomLevel) === 1 ? 'PG' : 'COMP'
  return makeClientFetcher(
    () => listSelectableComponents(undefined, type).then((r) => r.data ?? []),
    ['componentCode', 'componentName'],
  )
})

function onPick(row: any) {
  if (isProduct.value) {
    props.model.materielCode = row.materiel
    props.model.materielDesc = row.materielDesc
  } else {
    props.model.materielCode = row.componentCode
    props.model.materielDesc = row.componentName
  }
}

function submit() {
  if (props.model.bomLevel == null) {
    notify.error('请选择 BOM 层级')
    return
  }
  if (!props.model.materielCode || !props.model.materielDesc) {
    notify.error(isProduct.value ? '请选择产品物料' : '请选择零部件')
    return
  }
  emit('submit')
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>BOM 头信息；子项明细请进入结构页维护</DialogDescription>
      </DialogHeader>

      <div class="grid grid-cols-2 gap-x-4 gap-y-3">
        <div class="space-y-1.5">
          <Label>BOM 编码</Label>
          <Input
            :model-value="model.bomCode"
            readonly
            placeholder="保存后自动生成"
            class="bg-muted text-muted-foreground"
          />
        </div>

        <div class="space-y-1.5">
          <Label class="after:ml-0.5 after:text-destructive after:content-['*']">BOM 层级</Label>
          <Select
            :model-value="model.bomLevel != null ? String(model.bomLevel) : undefined"
            @update:model-value="onLevelChange"
          >
            <SelectTrigger><SelectValue placeholder="请选择层级" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="o in BOM_LEVEL_OPTIONS" :key="o.value" :value="String(o.value)">
                {{ o.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="col-span-2 space-y-1.5">
          <Label class="after:ml-0.5 after:text-destructive after:content-['*']">
            {{ isProduct ? '产品物料' : '零部件' }}
          </Label>
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm transition-colors hover:border-primary/60 hover:bg-accent/40"
            @click="pickerOpen = true"
          >
            <span v-if="model.materielCode" class="flex flex-col">
              <span class="font-medium">{{ model.materielDesc }}</span>
              <span class="text-xs text-muted-foreground">{{ model.materielCode }}</span>
            </span>
            <span v-else class="flex items-center gap-1.5 text-muted-foreground">
              <PackageSearch class="h-4 w-4" />
              {{ isProduct ? '点击选择产品物料' : '点击选择零部件' }}
            </span>
            <MousePointerClick class="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </div>

        <div class="space-y-1.5">
          <Label>版本号</Label>
          <Input :model-value="model.versionNumber" placeholder="如：V1.0"
            @update:model-value="model.versionNumber = $event" />
        </div>
        <div class="space-y-1.5">
          <Label>工厂</Label>
          <Input :model-value="model.factory" @update:model-value="model.factory = $event" />
        </div>

        <div class="col-span-2 space-y-1.5">
          <Label>备注</Label>
          <Textarea :model-value="model.remark" @update:model-value="model.remark = $event" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button :disabled="loading" @click="submit">
          <LoaderCircle v-if="loading" class="h-4 w-4 animate-spin" />保存
        </Button>
      </DialogFooter>
    </DialogContent>

    <SpPickerDialog
      v-model:open="pickerOpen"
      :title="pickerTitle"
      :columns="pickerColumns"
      :fetcher="pickerFetcher"
      :empty-hint="pickerEmptyHint"
      :row-key="isProduct ? 'id' : 'componentCode'"
      @select="onPick"
    />
  </Dialog>
</template>
