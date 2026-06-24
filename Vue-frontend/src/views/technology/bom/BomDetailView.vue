<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Motion, AnimatePresence } from 'motion-v'
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  Trash2,
  Save,
  Lock,
  ListTree,
  Link2,
  PackageSearch,
  Puzzle,
  Inbox,
} from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import SpStatusBadge from '@/components/common/SpStatusBadge.vue'
import SpConfirm from '@/components/common/SpConfirm.vue'
import SpPickerDialog from '@/components/common/SpPickerDialog.vue'
import {
  getBomDetail,
  listBomItems,
  saveBomWithItems,
  lockBom,
  listSelectableComponents,
  listSelectableBoms,
} from '@/api/modules/technology'
import { pageMaterials } from '@/api/modules/material'
import { makeClientFetcher, type PickerFetcher } from '@/lib/picker'
import { notify } from '@/lib/toast'
import { SPRING } from '@/lib/motion'
import {
  isLockedStatus,
  isProductBom,
  bomLevelLabel,
  matTypeLabel,
  matTypeTone,
  needsChildBom,
  toBomHeaderPayload,
} from './constants'
import type { TableColumn } from '@/types/table'
import type { Bom, BomItem } from '@/types/domain'

defineOptions({ name: 'BomDetail' })

const route = useRoute()
const router = useRouter()
const id = route.params.id as string
const reduce = usePreferredReducedMotion()

const bom = ref<Bom | null>(null)
const items = ref<BomItem[]>([])
const loading = ref(true)
const saving = ref(false)

const locked = computed(() => isLockedStatus(bom.value?.lockStatus))
const isProduct = computed(() => isProductBom(bom.value?.bomLevel))

async function load() {
  loading.value = true
  try {
    const [d, it] = await Promise.all([getBomDetail(id), listBomItems(id)])
    bom.value = d.data ?? null
    items.value = (it.data ?? []).map((x) => ({ ...x, itemNum: Number(x.itemNum) || 0 }))
  } finally {
    loading.value = false
  }
}
onMounted(load)

// ====== 选择器（单实例，按需配置）======
const picker = reactive<{
  open: boolean
  title: string
  description?: string
  columns: TableColumn[]
  fetcher: PickerFetcher | null
  emptyHint: string
  rowKey: string
  onSelect: (row: any) => void
}>({
  open: false,
  title: '',
  columns: [],
  fetcher: null,
  emptyHint: '暂无可选数据',
  rowKey: 'id',
  onSelect: () => {},
})

function openPicker(cfg: Partial<typeof picker>) {
  Object.assign(picker, cfg, { open: true })
}

const componentColumns: TableColumn[] = [
  { key: 'componentCode', title: '零部件编码', width: '160px' },
  { key: 'componentName', title: '名称' },
  { key: 'componentType', title: '类型', width: '90px', align: 'center' },
]
const materialColumns: TableColumn[] = [
  { key: 'materiel', title: '物料编码', width: '160px' },
  { key: 'materielDesc', title: '名称' },
  { key: 'matType', title: '类型', width: '90px', align: 'center' },
  { key: 'unit', title: '单位', width: '70px', align: 'center' },
]
const childBomColumns: TableColumn[] = [
  { key: 'bomCode', title: '子 BOM 编码', width: '160px' },
  { key: 'materielCode', title: '物料编码', width: '150px' },
  { key: 'materielDesc', title: '名称' },
  { key: 'versionNumber', title: '版本', width: '80px', align: 'center' },
]

function newLine(): BomItem {
  return {
    materielItemCode: '',
    materielItemDesc: '',
    itemMatType: 'PART',
    itemNum: 1,
    itemUnit: '',
    operTyper: '',
    childBomId: '',
    childBomCode: '',
  }
}

/** 添加零部件（半成品/组件，来源：零部件定义） */
function addComponent() {
  openPicker({
    title: '选择零部件',
    columns: componentColumns,
    rowKey: 'componentCode',
    emptyHint: isProduct.value
      ? '该产品尚未维护启用的零部件定义，请先到「零部件定义」维护'
      : '暂无可用零部件',
    fetcher: makeClientFetcher(
      () =>
        listSelectableComponents(isProduct.value ? bom.value?.materielDesc : undefined).then(
          (r) => r.data ?? [],
        ),
      ['componentCode', 'componentName'],
    ),
    onSelect: (row) => {
      items.value.push({
        ...newLine(),
        materielItemCode: row.componentCode,
        materielItemDesc: row.componentName,
        itemMatType: row.componentType || 'COMP',
      })
    },
  })
}

/** 添加零件（PART，来源：物料档案） */
function addPart() {
  openPicker({
    title: '选择零件物料',
    columns: materialColumns,
    rowKey: 'id',
    emptyHint: '暂无物料',
    fetcher: async ({ keyword, page, size }) => {
      const res = await pageMaterials({ current: page, size, materielLike: keyword })
      return { records: res.data?.records ?? [], total: res.data?.total ?? 0 }
    },
    onSelect: (row) => {
      items.value.push({
        ...newLine(),
        materielItemCode: row.materiel,
        materielItemDesc: row.materielDesc,
        itemMatType: 'PART',
        itemUnit: row.unit || '',
      })
    },
  })
}

/** 关联子 BOM（写入 childBomId） */
function linkChildBom(item: BomItem) {
  openPicker({
    title: `关联子 BOM · ${item.materielItemDesc}`,
    columns: childBomColumns,
    rowKey: 'id',
    emptyHint: '暂无已定版且有效的可选子 BOM',
    fetcher: makeClientFetcher(
      () =>
        listSelectableBoms(item.itemMatType, item.materielItemCode).then((r) => r.data ?? []),
      ['bomCode', 'materielCode', 'materielDesc'],
    ),
    onSelect: (row) => {
      item.childBomId = row.id
      item.childBomCode = row.bomCode
    },
  })
}

function removeItem(idx: number) {
  items.value.splice(idx, 1)
}

function buildItems() {
  return items.value.map((it, i) => ({
    materielItemCode: it.materielItemCode,
    materielItemDesc: it.materielItemDesc,
    itemMatType: it.itemMatType,
    itemNum: Number(it.itemNum) || 0,
    itemUnit: it.itemUnit ?? '',
    operTyper: it.operTyper ?? '',
    lineNo: String(i + 1),
    childBomId: it.childBomId ?? '',
  }))
}

/** 校验子项；返回是否通过 */
function validateItems(): boolean {
  for (const it of items.value) {
    if (!it.materielItemCode) {
      notify.error('存在未选择物料/零部件的子项')
      return false
    }
    if (!(Number(it.itemNum) > 0)) {
      notify.error(`子项【${it.materielItemDesc || it.materielItemCode}】用量必须大于 0`)
      return false
    }
  }
  return true
}

/** 原子保存；silent=true 时不弹成功提示（用于定版前自动保存） */
async function doSave(silent = false): Promise<boolean> {
  if (!bom.value) return false
  if (!validateItems()) return false
  saving.value = true
  try {
    await saveBomWithItems(toBomHeaderPayload(bom.value), buildItems())
    if (!silent) notify.success('保存成功')
    return true
  } catch {
    return false
  } finally {
    saving.value = false
  }
}

async function onSave() {
  if (await doSave()) await load()
}

// ====== 定版 ======
const lockConfirmOpen = ref(false)
const locking = ref(false)
async function onLockConfirm() {
  if (!bom.value?.id) return
  locking.value = true
  try {
    // 先保存最新明细，再定版（后端基于库内数据校验）
    if (!(await doSave(true))) return
    await lockBom(bom.value.id)
    notify.success('定版成功')
    lockConfirmOpen.value = false
    await load()
  } catch {
    /* 校验失败信息由拦截器提示 */
  } finally {
    locking.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- 顶部操作条 -->
    <div class="flex flex-wrap items-center gap-3">
      <Button variant="outline" size="sm" @click="router.push('/technology/bom')">
        <ArrowLeft class="h-4 w-4" />返回
      </Button>
      <h2 class="text-lg font-semibold">{{ bom?.bomCode || 'BOM 结构' }}</h2>
      <SpStatusBadge
        v-if="bom"
        :tone="locked ? 'success' : 'muted'"
        :text="locked ? '已定版' : '草稿'"
      />
      <div class="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" title="刷新" @click="load">
          <RefreshCw class="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" @click="router.push(`/technology/bom/${id}/tree`)">
          <ListTree class="h-4 w-4" />结构树
        </Button>
        <template v-if="!locked">
          <Button variant="outline" size="sm" :disabled="saving" @click="onSave">
            <Save class="h-4 w-4" />保存
          </Button>
          <Button size="sm" @click="lockConfirmOpen = true">
            <Lock class="h-4 w-4" />定版
          </Button>
        </template>
      </div>
    </div>

    <Skeleton v-if="loading" class="h-28 w-full" />

    <template v-else-if="bom">
      <!-- BOM 头信息 -->
      <Card>
        <CardHeader class="pb-3"><CardTitle class="text-base">BOM 信息</CardTitle></CardHeader>
        <CardContent class="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <div class="flex items-center justify-between border-b pb-2 text-sm">
            <span class="text-muted-foreground">产品物料</span>
            <span class="font-medium">{{ bom.materielCode || '—' }}</span>
          </div>
          <div class="flex items-center justify-between border-b pb-2 text-sm">
            <span class="text-muted-foreground">产品名称</span>
            <span class="font-medium">{{ bom.materielDesc || '—' }}</span>
          </div>
          <div class="flex items-center justify-between border-b pb-2 text-sm">
            <span class="text-muted-foreground">层级</span>
            <span class="font-medium">{{ bomLevelLabel(bom.bomLevel) }}</span>
          </div>
          <div class="flex items-center justify-between border-b pb-2 text-sm">
            <span class="text-muted-foreground">版本</span>
            <Input
              v-if="!locked"
              v-model="bom.versionNumber"
              class="h-7 w-28 text-right"
              placeholder="如 V1.0"
            />
            <span v-else class="font-medium">{{ bom.versionNumber || '—' }}</span>
          </div>
          <div class="flex items-center justify-between border-b pb-2 text-sm">
            <span class="text-muted-foreground">工厂</span>
            <Input v-if="!locked" v-model="bom.factory" class="h-7 w-28 text-right" />
            <span v-else class="font-medium">{{ bom.factory || '—' }}</span>
          </div>
          <div class="flex items-center justify-between border-b pb-2 text-sm">
            <span class="text-muted-foreground">有效性</span>
            <span class="font-medium">{{ bom.validity || '—' }}</span>
          </div>
        </CardContent>
      </Card>

      <!-- 子项明细 -->
      <div class="flex flex-col rounded-lg border bg-card shadow-sp">
        <div class="flex flex-wrap items-center gap-2 border-b p-3">
          <span class="text-sm font-medium">子项明细</span>
          <span class="text-xs text-muted-foreground">共 {{ items.length }} 项</span>
          <div v-if="!locked" class="ml-auto flex items-center gap-2">
            <Button v-if="isProduct" size="sm" @click="addComponent">
              <Puzzle class="h-4 w-4" />添加零部件
            </Button>
            <template v-else>
              <Button size="sm" @click="addPart"><Plus class="h-4 w-4" />添加零件</Button>
              <Button variant="outline" size="sm" @click="addComponent">
                <Puzzle class="h-4 w-4" />添加部件
              </Button>
            </template>
          </div>
          <span v-else class="ml-auto text-xs text-muted-foreground">已定版 · 只读</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-muted/40 text-left text-muted-foreground">
                <th class="w-14 px-3 py-2 text-center">行号</th>
                <th class="px-3 py-2">节点编号</th>
                <th class="px-3 py-2">节点名称</th>
                <th class="w-24 px-3 py-2 text-center">类型</th>
                <th class="w-28 px-3 py-2 text-right">用量</th>
                <th class="w-24 px-3 py-2">单位</th>
                <th class="w-32 px-3 py-2">装配工序</th>
                <th class="w-44 px-3 py-2">关联子 BOM</th>
                <th v-if="!locked" class="w-16 px-3 py-2 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="items.length === 0">
                <td :colspan="locked ? 8 : 9" class="py-14">
                  <div class="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Inbox class="h-8 w-8" />
                    <span class="text-sm">还没有子项，点击右上角添加</span>
                  </div>
                </td>
              </tr>
              <AnimatePresence>
                <Motion
                  v-for="(item, idx) in items"
                  :key="item.id ?? `${item.materielItemCode}-${idx}`"
                  as="tr"
                  :initial="reduce === 'reduce' ? false : { opacity: 0, y: 6 }"
                  :animate="{ opacity: 1, y: 0 }"
                  :exit="reduce === 'reduce' ? undefined : { opacity: 0, x: -12 }"
                  :transition="SPRING"
                  class="border-t hover:bg-accent/30"
                >
                  <td class="px-3 py-2 text-center text-muted-foreground">{{ idx + 1 }}</td>
                  <td class="px-3 py-2 font-medium">{{ item.materielItemCode }}</td>
                  <td class="px-3 py-2">{{ item.materielItemDesc }}</td>
                  <td class="px-3 py-2 text-center">
                    <SpStatusBadge
                      :tone="matTypeTone(item.itemMatType)"
                      :text="matTypeLabel(item.itemMatType)"
                    />
                  </td>
                  <td class="px-3 py-2 text-right">
                    <Input
                      v-if="!locked"
                      v-model.number="item.itemNum"
                      type="number"
                      min="0"
                      step="any"
                      class="h-7 w-24 text-right"
                    />
                    <span v-else>{{ item.itemNum }}</span>
                  </td>
                  <td class="px-3 py-2">
                    <Input v-if="!locked" v-model="item.itemUnit" class="h-7 w-20" />
                    <span v-else>{{ item.itemUnit || '—' }}</span>
                  </td>
                  <td class="px-3 py-2">
                    <Input v-if="!locked" v-model="item.operTyper" class="h-7 w-28" />
                    <span v-else>{{ item.operTyper || '—' }}</span>
                  </td>
                  <td class="px-3 py-2">
                    <template v-if="needsChildBom(item.itemMatType)">
                      <button
                        v-if="!locked"
                        type="button"
                        class="flex w-full items-center gap-1.5 rounded-md border px-2 py-1 text-left text-xs transition-colors hover:border-primary/60 hover:bg-accent/40"
                        @click="linkChildBom(item)"
                      >
                        <Link2 class="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span :class="item.childBomCode ? 'font-medium' : 'text-muted-foreground'">
                          {{ item.childBomCode || '点击关联' }}
                        </span>
                      </button>
                      <span v-else class="text-xs">{{ item.childBomCode || '—' }}</span>
                    </template>
                    <span v-else class="text-xs text-muted-foreground">—</span>
                  </td>
                  <td v-if="!locked" class="px-3 py-2 text-center">
                    <Button variant="ghost" size="icon-sm" title="删除" @click="removeItem(idx)">
                      <Trash2 class="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </Motion>
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        <div
          v-if="isProduct && !locked"
          class="flex items-center gap-2 border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
        >
          <PackageSearch class="h-3.5 w-3.5" />
          产品 BOM 的子项来自「零部件定义」，半成品/组件需关联已定版的子 BOM 后方可定版。
        </div>
      </div>
    </template>

    <SpPickerDialog
      v-model:open="picker.open"
      :title="picker.title"
      :columns="picker.columns"
      :fetcher="picker.fetcher"
      :empty-hint="picker.emptyHint"
      :row-key="picker.rowKey"
      @select="(row) => picker.onSelect(row)"
    />

    <SpConfirm
      v-model:open="lockConfirmOpen"
      title="BOM 定版"
      :confirming="locking"
      description="定版将先保存当前明细并锁定 BOM，锁定后不可再修改。确定继续？"
      @confirm="onLockConfirm"
    />
  </div>
</template>
