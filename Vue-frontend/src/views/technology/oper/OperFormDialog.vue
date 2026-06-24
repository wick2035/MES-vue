<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { LoaderCircle, Building2, Cpu, Users } from 'lucide-vue-next'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SpCombobox, type ComboboxOption } from '@/components/ui/combobox'
import { listProcessingUnits } from '@/api/modules/technology'
import { listTeams } from '@/api/modules/team'
import { getDeptTree } from '@/api/modules/system'
import { notify } from '@/lib/toast'
import type { TreeNode } from '@/types/domain'

const props = defineProps<{ open: boolean; model: Record<string, any>; loading?: boolean }>()
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'submit'): void
}>()

const isEdit = computed(() => !!props.model.id)
const title = computed(() => (isEdit.value ? '编辑工序' : '新增工序'))

// ====== 下拉数据源（部门 / 加工单元 / 班组）======
const deptOptions = ref<ComboboxOption[]>([])
const unitOptions = ref<ComboboxOption[]>([])
const teamOptions = ref<ComboboxOption[]>([])

/** 递归拍平部门树为缩进选项 */
function flattenDept(nodes: TreeNode[], depth = 0, acc: ComboboxOption[] = []): ComboboxOption[] {
  for (const n of nodes) {
    acc.push({
      value: n.id,
      label: `${'　'.repeat(depth)}${n.name}`,
    })
    if (n.children?.length) flattenDept(n.children, depth + 1, acc)
  }
  return acc
}

async function loadOptions() {
  try {
    const [deptRes, unitRes, teamRes] = await Promise.all([
      getDeptTree(),
      listProcessingUnits(),
      listTeams(),
    ])
    deptOptions.value = flattenDept(deptRes.data ?? [])
    unitOptions.value = (unitRes.data ?? []).map((u) => ({
      value: u.id ?? '',
      label: u.unitName ?? '',
      description: u.unitType === 'device' ? '设备作业单元' : '人员作业单元',
    }))
    teamOptions.value = (teamRes.data ?? []).map((t) => ({
      value: t.id ?? '',
      label: t.teamName ?? '',
      description: t.teamCode,
    }))
  } catch {
    /* 错误已由拦截器统一提示 */
  }
}
onMounted(loadOptions)

function isPositiveInteger(v: any): boolean {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 && Number.isInteger(n)
}

function submit() {
  if (!String(props.model.operDesc ?? '').trim()) {
    notify.error('请填写工序名称')
    return
  }
  if (!props.model.deptId) {
    notify.error('请绑定归口部门')
    return
  }
  if (!props.model.unitId) {
    notify.error('请绑定加工单元')
    return
  }
  if (!isPositiveInteger(props.model.operHours)) {
    notify.error('工序工时必须为正整数')
    return
  }
  if (!isPositiveInteger(props.model.manuCycle)) {
    notify.error('制造周期必须为正整数')
    return
  }
  if (Number(props.model.manuCycle) < Number(props.model.operHours)) {
    notify.error('制造周期应大于等于工序工时')
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
        <DialogDescription>工序真实绑定归口部门、加工单元与执行班组</DialogDescription>
      </DialogHeader>

      <div class="grid grid-cols-2 gap-x-4 gap-y-3">
        <div class="space-y-1.5">
          <Label>工序编码</Label>
          <Input
            :model-value="model.oper"
            readonly
            placeholder="保存后自动生成"
            class="bg-white text-muted-foreground"
          />
        </div>

        <div class="space-y-1.5">
          <Label class="after:ml-0.5 after:text-destructive after:content-['*']">工序名称</Label>
          <Input
            :model-value="model.operDesc"
            placeholder="如：备料、冲压"
            @update:model-value="model.operDesc = $event"
          />
        </div>

        <div class="space-y-1.5">
          <Label class="flex items-center gap-1 after:ml-0.5 after:text-destructive after:content-['*']">
            <Building2 class="h-3.5 w-3.5 text-muted-foreground" />归口部门
          </Label>
          <SpCombobox
            :model-value="model.deptId ?? ''"
            :options="deptOptions"
            placeholder="选择部门"
            search-placeholder="搜索部门"
            empty-text="暂无部门，请先到部门管理维护"
            @update:model-value="model.deptId = $event as string"
          />
        </div>

        <div class="space-y-1.5">
          <Label class="flex items-center gap-1 after:ml-0.5 after:text-destructive after:content-['*']">
            <Cpu class="h-3.5 w-3.5 text-muted-foreground" />加工单元
          </Label>
          <SpCombobox
            :model-value="model.unitId ?? ''"
            :options="unitOptions"
            placeholder="选择加工单元"
            search-placeholder="搜索加工单元"
            empty-text="暂无加工单元，请先到加工单元维护"
            @update:model-value="model.unitId = $event as string"
          />
        </div>

        <div class="col-span-2 space-y-1.5">
          <Label class="flex items-center gap-1">
            <Users class="h-3.5 w-3.5 text-muted-foreground" />执行班组
            <span class="text-xs font-normal text-muted-foreground">（选填，人员通过班组体现）</span>
          </Label>
          <SpCombobox
            :model-value="model.teamId ?? ''"
            :options="teamOptions"
            placeholder="选择班组"
            search-placeholder="搜索班组"
            empty-text="暂无班组，请先到班组管理维护"
            @update:model-value="model.teamId = $event as string"
          />
        </div>

        <div class="space-y-1.5">
          <Label class="after:ml-0.5 after:text-destructive after:content-['*']">工时(小时)</Label>
          <Input
            :model-value="model.operHours"
            type="number"
            min="1"
            step="1"
            @update:model-value="model.operHours = $event === '' ? null : Number($event)"
          />
        </div>

        <div class="space-y-1.5">
          <Label class="after:ml-0.5 after:text-destructive after:content-['*']">制造周期(小时)</Label>
          <Input
            :model-value="model.manuCycle"
            type="number"
            min="1"
            step="1"
            @update:model-value="model.manuCycle = $event === '' ? null : Number($event)"
          />
        </div>

        <div class="space-y-1.5">
          <Label>生成计划</Label>
          <Select
            :model-value="model.genPlan ?? 'Y'"
            @update:model-value="model.genPlan = $event"
          >
            <SelectTrigger><SelectValue placeholder="请选择" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Y">是</SelectItem>
              <SelectItem value="N">否</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="col-span-2 space-y-1.5">
          <Label>备注</Label>
          <Textarea
            :model-value="model.remark"
            placeholder="可选"
            @update:model-value="model.remark = $event"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button :disabled="loading" @click="submit">
          <LoaderCircle v-if="loading" class="h-4 w-4 animate-spin" />保存
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
