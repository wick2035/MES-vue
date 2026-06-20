<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import {
  Warehouse,
  Boxes,
  Layers,
  Gauge,
  RefreshCw,
  Loader2,
  MapPin,
  Eye,
  Navigation,
  Target,
  AlertTriangle,
  PackageCheck,
} from 'lucide-vue-next'
import { getWarehouseTwinData } from '@/api/modules/twin'
import { WarehouseTwinScene } from '@/lib/twin/warehouseScene'
import type { TwinLocation, TwinWarehouse } from '@/types/domain'
import { notify } from '@/lib/toast'

defineOptions({ name: 'WarehouseTwin' })

const canvasEl = ref<HTMLCanvasElement | null>(null)
const wrapEl = ref<HTMLElement | null>(null)
const loading = ref(true)
const firstLoad = ref(true)
const updatedAt = ref('')
const warehouses = ref<TwinWarehouse[]>([])
const activeIdx = ref(0)
const hovered = ref<TwinLocation | null>(null)
const loadError = ref('')
const viewMode = ref<'overview' | 'dock' | 'aisle' | 'focus'>('overview')

let scene: WarehouseTwinScene | null = null
let ro: ResizeObserver | null = null
let timer: ReturnType<typeof setInterval> | null = null

const active = computed<TwinWarehouse | null>(() => warehouses.value[activeIdx.value] ?? null)
const detail = computed(() => hovered.value)
const hasFocusTarget = computed(() => !!hovered.value)
const viewActions = computed(() => [
  { key: 'overview' as const, label: '总览', icon: Eye },
  { key: 'dock' as const, label: '装卸区', icon: PackageCheck },
  { key: 'aisle' as const, label: '巷道', icon: Navigation },
  { key: 'focus' as const, label: '聚焦库位', icon: Target, disabled: !hasFocusTarget.value },
])

function formatQty(value?: number, unit?: string) {
  const qty = Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 1 })
  return unit ? `${qty} ${unit}` : qty
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await getWarehouseTwinData()
    warehouses.value = data.warehouses || []
    if (activeIdx.value >= warehouses.value.length) activeIdx.value = 0
    scene?.setWarehouse(active.value)
    updatedAt.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  } catch (e) {
    loadError.value = '库房孪生数据加载失败，请确认后端服务与库存台账可用'
  } finally {
    loading.value = false
    firstLoad.value = false
  }
}

function refresh() {
  load().then(() => notify.success('库房孪生数据已刷新'))
}

function selectWarehouse(i: number) {
  activeIdx.value = i
  hovered.value = null
  scene?.setWarehouse(active.value)
  scene?.setView(viewMode.value)
}

function setView(mode: 'overview' | 'dock' | 'aisle' | 'focus') {
  if (mode === 'focus' && !hovered.value) {
    notify.info('请先悬停一个库位，再聚焦查看')
    return
  }
  viewMode.value = mode
  if (mode === 'focus') scene?.focusLocation(hovered.value)
  else scene?.setView(mode)
}

onMounted(async () => {
  if (canvasEl.value && wrapEl.value) {
    scene = new WarehouseTwinScene()
    scene.init(canvasEl.value, wrapEl.value)
    scene.onHover((loc) => (hovered.value = loc))
    ro = new ResizeObserver(() => scene?.resize())
    ro.observe(wrapEl.value)
  }
  await load()
  timer = setInterval(load, 30000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  ro?.disconnect()
  scene?.dispose()
  scene = null
})
</script>

<template>
  <div ref="wrapEl" class="relative h-full min-h-0 overflow-hidden border bg-[#eef2f8]">
    <canvas ref="canvasEl" class="block h-full w-full" />

    <!-- HUD 覆盖层 -->
    <div class="pointer-events-none absolute inset-0 p-3 text-slate-700 sm:p-4">
      <!-- 顶部标题 + 库房选择 + 视角 -->
      <div class="flex items-start justify-between gap-3">
        <div
          class="max-w-[calc(100vw-1.5rem)] rounded-lg border border-slate-200/80 bg-white/86 px-4 py-3 shadow-sp backdrop-blur"
        >
          <div class="flex items-center gap-2.5">
            <span
              class="flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-amber-300 shadow"
            >
              <Warehouse class="h-5 w-5" />
            </span>
            <div>
              <h2 class="text-base font-semibold leading-tight text-slate-900">仓储控制台</h2>
              <p class="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span class="relative flex h-2 w-2">
                  <span
                    class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
                  />
                  <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                高位货架 · 库位占用实时映射 · 数据源自库存台账
              </p>
            </div>
          </div>

          <!-- 库房切换 -->
          <div v-if="warehouses.length" class="pointer-events-auto mt-3 flex flex-wrap gap-1.5">
            <button
              v-for="(w, i) in warehouses"
              :key="w.id"
              class="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors"
              :class="
                i === activeIdx
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-primary'
              "
              @click="selectWarehouse(i)"
            >
              {{ w.name || w.code }}
            </button>
          </div>

          <div class="pointer-events-auto mt-3 flex flex-wrap gap-1.5">
            <button
              v-for="action in viewActions"
              :key="action.key"
              class="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45"
              :class="
                viewMode === action.key
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900'
              "
              :disabled="action.disabled"
              @click="setView(action.key)"
            >
              <component :is="action.icon" class="h-3.5 w-3.5" />
              {{ action.label }}
            </button>
          </div>
        </div>

        <button
          class="pointer-events-auto flex items-center gap-1.5 rounded-md border border-slate-200 bg-white/86 px-3 py-2 text-xs text-slate-600 shadow-sp backdrop-blur transition-colors hover:bg-white"
          @click="refresh"
        >
          <RefreshCw class="h-3.5 w-3.5" :class="loading && 'animate-spin'" />
          <span>{{ updatedAt || '刷新' }}</span>
        </button>
      </div>

      <!-- 右侧指标面板 -->
      <div class="absolute right-4 top-24 hidden w-64 space-y-3 lg:block">
        <div class="grid grid-cols-2 gap-2">
          <div class="rounded-lg border border-slate-200/80 bg-white/86 p-3 shadow-sp backdrop-blur">
            <div class="flex items-center gap-1 text-[11px] text-slate-500">
              <MapPin class="h-3 w-3" />库位总数
            </div>
            <div class="mt-0.5 text-xl font-semibold text-slate-800">
              {{ active?.summary.locationCount ?? 0 }}
            </div>
          </div>
          <div class="rounded-lg border border-slate-200/80 bg-white/86 p-3 shadow-sp backdrop-blur">
            <div class="flex items-center gap-1 text-[11px] text-slate-500">
              <Layers class="h-3 w-3" />已占用
            </div>
            <div class="mt-0.5 text-xl font-semibold text-blue-600">
              {{ active?.summary.occupiedCount ?? 0 }}
            </div>
          </div>
          <div class="rounded-lg border border-slate-200/80 bg-white/86 p-3 shadow-sp backdrop-blur">
            <div class="flex items-center gap-1 text-[11px] text-slate-500">
              <Gauge class="h-3 w-3" />占用率
            </div>
            <div class="mt-0.5 text-xl font-semibold text-indigo-600">
              {{ (active?.summary.occupancyRate ?? 0).toFixed(1)
              }}<span class="text-xs text-slate-400">%</span>
            </div>
          </div>
          <div class="rounded-lg border border-slate-200/80 bg-white/86 p-3 shadow-sp backdrop-blur">
            <div class="flex items-center gap-1 text-[11px] text-slate-500">
              <Boxes class="h-3 w-3" />库存量
            </div>
            <div class="mt-0.5 text-xl font-semibold text-slate-800 tabular-nums">
              {{ Number(active?.summary.totalQty ?? 0).toFixed(0) }}
            </div>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <div class="rounded-lg border border-slate-200/80 bg-white/86 p-2.5 shadow-sp backdrop-blur">
            <div class="text-[10px] text-slate-500">空闲</div>
            <div class="mt-0.5 text-lg font-semibold text-slate-700">
              {{ active?.summary.emptyCount ?? 0 }}
            </div>
          </div>
          <div class="rounded-lg border border-slate-200/80 bg-white/86 p-2.5 shadow-sp backdrop-blur">
            <div class="text-[10px] text-slate-500">禁用</div>
            <div class="mt-0.5 text-lg font-semibold text-slate-500">
              {{ active?.summary.disabledCount ?? 0 }}
            </div>
          </div>
          <div class="rounded-lg border border-slate-200/80 bg-white/86 p-2.5 shadow-sp backdrop-blur">
            <div class="text-[10px] text-slate-500">峰值</div>
            <div class="mt-0.5 text-lg font-semibold text-amber-600">
              {{ Number(active?.summary.maxQty ?? 0).toFixed(0) }}
            </div>
          </div>
        </div>

        <!-- 悬停库位详情 -->
        <div class="rounded-lg border border-slate-200/80 bg-white/88 p-3 shadow-sp backdrop-blur">
          <div class="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-700">
            <span>库位详情</span>
            <span
              v-if="detail"
              class="rounded px-1.5 py-0.5 text-[10px]"
              :class="
                detail.disabled
                  ? 'bg-slate-200 text-slate-500'
                  : detail.occupied
                    ? 'bg-blue-500/15 text-blue-600'
                    : 'bg-slate-100 text-slate-500'
              "
            >
              {{ detail.statusText || (detail.disabled ? '禁用' : detail.occupied ? '占用' : '空闲') }}
            </span>
          </div>
          <template v-if="detail">
            <div class="font-mono text-sm text-slate-900">{{ detail.code || '—' }}</div>
            <div class="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
              <span>组 {{ detail.group }} · 排 {{ detail.row }}</span>
              <span>层 {{ detail.layer }} · 列 {{ detail.column }}</span>
            </div>
            <div class="mt-2 rounded-md bg-slate-50 p-2 text-xs text-slate-600">
              <div class="flex items-center justify-between">
                <span>库存</span>
                <span class="font-semibold tabular-nums text-slate-900">
                  {{ formatQty(detail.qty, detail.unit) }}
                </span>
              </div>
              <div class="mt-1 flex items-center justify-between">
                <span>物料</span>
                <span class="max-w-[150px] truncate text-right">{{ detail.materiel || detail.materialCode || '—' }}</span>
              </div>
              <div class="mt-1 flex items-center justify-between">
                <span>批次</span>
                <span class="max-w-[150px] truncate font-mono text-[11px]">{{ detail.batchNo || '—' }}</span>
              </div>
            </div>
          </template>
          <p v-else class="text-[11px] text-slate-400">移动鼠标悬停库位查看详情</p>
        </div>
      </div>

      <!-- 底部图例 -->
      <div
        class="absolute bottom-4 left-4 hidden items-center gap-4 rounded-md border border-slate-200/80 bg-white/86 px-3 py-2 text-[11px] text-slate-600 shadow-sp backdrop-blur md:flex"
      >
        <span class="flex items-center gap-1.5"
          ><span class="h-2.5 w-2.5 rounded-sm" style="background: #d5dded" />空闲</span
        >
        <span class="flex items-center gap-1.5"
          ><span class="h-2.5 w-2.5 rounded-sm" style="background: #93c5fd" />低</span
        >
        <span class="flex items-center gap-1.5"
          ><span class="h-2.5 w-2.5 rounded-sm" style="background: #3b82f6" />中</span
        >
        <span class="flex items-center gap-1.5"
          ><span class="h-2.5 w-2.5 rounded-sm" style="background: #1d4ed8" />满</span
        >
        <span class="flex items-center gap-1.5"
          ><span class="h-2.5 w-2.5 rounded-sm" style="background: #94a3b8" />禁用</span
        >
        <span class="ml-1 text-slate-400">拖拽旋转 · 滚轮缩放</span>
      </div>
    </div>

    <div
      v-if="loadError"
      class="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-lg border border-red-200 bg-white/90 px-4 py-3 text-sm text-red-600 shadow-sp-lg backdrop-blur"
    >
      <AlertTriangle class="h-4 w-4" />
      {{ loadError }}
    </div>

    <!-- 空态 -->
    <div
      v-if="!loading && !loadError && !warehouses.length"
      class="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-400"
    >
      暂无库房数据，请先在「基础数据 / 库房管理」维护库房与库位
    </div>

    <!-- 首屏加载 -->
    <div
      v-if="loading && firstLoad"
      class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/50 text-slate-600 backdrop-blur-sm"
    >
      <Loader2 class="h-7 w-7 animate-spin text-blue-500" />
      <p class="text-sm">正在构建库房孪生场景…</p>
    </div>
  </div>
</template>
