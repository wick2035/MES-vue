<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Motion, AnimatePresence } from 'motion-v'
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  Trash2,
  Save,
  ArrowUp,
  ArrowDown,
  Workflow,
  Wand2,
  Inbox,
  Building2,
  Cpu,
  Users,
} from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import SpPickerDialog from '@/components/common/SpPickerDialog.vue'
import { getFlow, getFlowSteps, saveFlowSteps, saveFlow, pageOpers } from '@/api/modules/technology'
import { type PickerFetcher } from '@/lib/picker'
import { notify } from '@/lib/toast'
import { SPRING } from '@/lib/motion'
import type { TableColumn } from '@/types/table'
import type { Flow, FlowStep } from '@/types/domain'

defineOptions({ name: 'FlowDetail' })

const route = useRoute()
const router = useRouter()
const id = route.params.id as string
const reduce = usePreferredReducedMotion()

const flow = ref<Flow | null>(null)
const steps = ref<FlowStep[]>([])
const loading = ref(true)
const saving = ref(false)

/** 按当前步骤生成的流程时序文本（备料 → 冲压 → 焊接） */
const stepSummary = computed(() =>
  steps.value.map((s) => s.operDesc || s.oper || '').filter(Boolean).join(' → '),
)
const totalHours = computed(() =>
  steps.value.reduce((sum, s) => sum + (Number(s.operHours) || 0), 0),
)

async function load() {
  loading.value = true
  try {
    const [f, st] = await Promise.all([getFlow(id), getFlowSteps(id)])
    flow.value = f.data ?? null
    steps.value = st.data ?? []
  } finally {
    loading.value = false
  }
}
onMounted(load)

// ====== 工序选择器（复用已联表回显部门/班组/加工单元的分页接口）======
const pickerOpen = ref(false)
const operColumns: TableColumn[] = [
  { key: 'oper', title: '工序编码', width: '150px' },
  { key: 'operDesc', title: '工序名称' },
  { key: 'deptName', title: '部门', width: '120px' },
  { key: 'unitName', title: '加工单元', width: '140px' },
  { key: 'teamName', title: '班组', width: '120px' },
]
const operFetcher: PickerFetcher = async ({ keyword, page, size }) => {
  const res = await pageOpers({ current: page, size, operDescLike: keyword })
  return { records: res.data?.records ?? [], total: res.data?.total ?? 0 }
}
function onPickOper(row: any) {
  if (!row?.id) return
  steps.value.push({
    operId: row.id,
    oper: row.oper,
    operDesc: row.operDesc,
    operHours: row.operHours,
    deptName: row.deptName,
    teamName: row.teamName,
    unitName: row.unitName,
    unitTypeName: row.unitTypeName,
  })
}

function moveUp(idx: number) {
  if (idx <= 0) return
  const arr = steps.value
  ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
}
function moveDown(idx: number) {
  if (idx >= steps.value.length - 1) return
  const arr = steps.value
  ;[arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]]
}
function removeStep(idx: number) {
  steps.value.splice(idx, 1)
}

/** 用当前步骤填充流程备注 */
function fillProcessFromSteps() {
  if (!flow.value) return
  flow.value.process = stepSummary.value
  notify.info('已根据步骤生成流程备注，保存后生效')
}

async function onSave() {
  if (!flow.value) return
  saving.value = true
  try {
    // 1) 保存头信息备注（process 为独立可编辑备注，不由步骤自动覆盖）
    await saveFlow({
      id: flow.value.id,
      flowDesc: flow.value.flowDesc,
      process: flow.value.process ?? '',
    })
    // 2) 按顺序重建步骤关系
    await saveFlowSteps(
      id,
      steps.value.map((s) => s.operId),
    )
    notify.success('保存成功')
    await load()
  } catch {
    /* 错误已由拦截器统一提示 */
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- 顶部操作条 -->
    <div class="flex flex-wrap items-center gap-3">
      <Button variant="outline" size="sm" @click="router.push('/technology/flow')">
        <ArrowLeft class="h-4 w-4" />返回
      </Button>
      <h2 class="flex items-center gap-2 text-lg font-semibold">
        <Workflow class="h-5 w-5 text-primary" />{{ flow?.flowDesc || '工艺路线配置' }}
      </h2>
      <span v-if="flow?.flow" class="text-sm text-muted-foreground">{{ flow.flow }}</span>
      <div class="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" title="刷新" @click="load">
          <RefreshCw class="h-4 w-4" />
        </Button>
        <Button size="sm" :disabled="saving" @click="onSave">
          <Save class="h-4 w-4" />保存
        </Button>
      </div>
    </div>

    <Skeleton v-if="loading" class="h-28 w-full" />

    <template v-else-if="flow">
      <!-- 头信息卡 -->
      <Card>
        <CardHeader class="pb-3"><CardTitle class="text-base">路线信息</CardTitle></CardHeader>
        <CardContent class="space-y-3">
          <div class="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-3">
            <div class="flex items-center justify-between border-b pb-2 text-sm">
              <span class="text-muted-foreground">路线名称</span>
              <span class="font-medium">{{ flow.flowDesc || '—' }}</span>
            </div>
            <div class="flex items-center justify-between border-b pb-2 text-sm">
              <span class="text-muted-foreground">工序数</span>
              <span class="font-medium">{{ steps.length }}</span>
            </div>
            <div class="flex items-center justify-between border-b pb-2 text-sm">
              <span class="text-muted-foreground">累计工时(h)</span>
              <span class="font-medium">{{ totalHours }}</span>
            </div>
          </div>
          <div class="space-y-1.5">
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">流程备注</span>
              <Button
                variant="ghost"
                size="sm"
                class="h-6 px-2 text-xs"
                :disabled="!steps.length"
                @click="fillProcessFromSteps"
              >
                <Wand2 class="h-3.5 w-3.5" />按步骤生成
              </Button>
            </div>
            <Textarea
              :model-value="flow.process"
              placeholder="独立备注，可手动编辑（如：备料 → 冲压 → 焊接 → 检验）"
              @update:model-value="flow.process = String($event)"
            />
            <p v-if="stepSummary" class="text-xs text-muted-foreground">
              当前步骤时序：{{ stepSummary }}
            </p>
          </div>
        </CardContent>
      </Card>

      <!-- 有序步骤表 -->
      <div class="flex flex-col rounded-lg border bg-card shadow-sp">
        <div class="flex flex-wrap items-center gap-2 border-b p-3">
          <span class="text-sm font-medium">工序步骤</span>
          <span class="text-xs text-muted-foreground">共 {{ steps.length }} 道工序</span>
          <div class="ml-auto">
            <Button size="sm" @click="pickerOpen = true"><Plus class="h-4 w-4" />添加工序</Button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-muted/40 text-left text-muted-foreground">
                <th class="w-14 px-3 py-2 text-center">顺序</th>
                <th class="px-3 py-2">工序</th>
                <th class="px-3 py-2">归口部门</th>
                <th class="px-3 py-2">加工单元</th>
                <th class="px-3 py-2">执行班组</th>
                <th class="w-24 px-3 py-2 text-right">工时(h)</th>
                <th class="w-32 px-3 py-2 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="steps.length === 0">
                <td colspan="7" class="py-14">
                  <div class="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Inbox class="h-8 w-8" />
                    <span class="text-sm">还没有工序，点击右上角「添加工序」</span>
                  </div>
                </td>
              </tr>
              <AnimatePresence>
                <Motion
                  v-for="(step, idx) in steps"
                  :key="`${step.operId}-${idx}`"
                  as="tr"
                  :initial="reduce === 'reduce' ? false : { opacity: 0, y: 6 }"
                  :animate="{ opacity: 1, y: 0 }"
                  :exit="reduce === 'reduce' ? undefined : { opacity: 0, x: -12 }"
                  :transition="SPRING"
                  class="border-t hover:bg-accent/30"
                >
                  <td class="px-3 py-2 text-center">
                    <span
                      class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary"
                      >{{ idx + 1 }}</span
                    >
                  </td>
                  <td class="px-3 py-2">
                    <div class="flex flex-col leading-tight">
                      <span class="font-medium">{{ step.operDesc || '—' }}</span>
                      <span class="text-xs text-muted-foreground">{{ step.oper }}</span>
                    </div>
                  </td>
                  <td class="px-3 py-2">
                    <span v-if="step.deptName" class="inline-flex items-center gap-1">
                      <Building2 class="h-3.5 w-3.5 text-muted-foreground" />{{ step.deptName }}
                    </span>
                    <span v-else class="text-xs text-muted-foreground">保存后显示</span>
                  </td>
                  <td class="px-3 py-2">
                    <span v-if="step.unitName" class="inline-flex items-center gap-1">
                      <Cpu class="h-3.5 w-3.5 text-muted-foreground" />{{ step.unitName }}
                    </span>
                    <span v-else class="text-xs text-muted-foreground">—</span>
                  </td>
                  <td class="px-3 py-2">
                    <span v-if="step.teamName" class="inline-flex items-center gap-1">
                      <Users class="h-3.5 w-3.5 text-muted-foreground" />{{ step.teamName }}
                    </span>
                    <span v-else class="text-xs text-muted-foreground">—</span>
                  </td>
                  <td class="px-3 py-2 text-right">{{ step.operHours ?? '—' }}</td>
                  <td class="px-3 py-2">
                    <div class="flex items-center justify-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="上移"
                        :disabled="idx === 0"
                        @click="moveUp(idx)"
                      >
                        <ArrowUp class="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="下移"
                        :disabled="idx === steps.length - 1"
                        @click="moveDown(idx)"
                      >
                        <ArrowDown class="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" title="移除" @click="removeStep(idx)">
                        <Trash2 class="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </Motion>
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        <div
          class="flex items-center gap-2 border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
        >
          <Workflow class="h-3.5 w-3.5" />
          每道工序的部门 / 班组 / 加工单元继承自「工序定义」，在此只读展示；如需调整请到工序定义维护。
        </div>
      </div>
    </template>

    <SpPickerDialog
      v-model:open="pickerOpen"
      title="选择工序"
      :columns="operColumns"
      :fetcher="operFetcher"
      empty-hint="暂无工序，请先到「工序定义」维护并绑定部门/加工单元"
      row-key="id"
      @select="onPickOper"
    />
  </div>
</template>
