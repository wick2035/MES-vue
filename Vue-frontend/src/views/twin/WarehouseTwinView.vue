<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { Warehouse, Boxes, Layers, Gauge, RefreshCw, Loader2, MapPin } from 'lucide-vue-next'
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

let scene: WarehouseTwinScene | null = null
let ro: ResizeObserver | null = null
let timer: ReturnType<typeof setInterval> | null = null

const active = computed<TwinWarehouse | null>(() => warehouses.value[activeIdx.value] ?? null)

async function load() {
  loading.value = true
  try {
    const { data } = await getWarehouseTwinData()
    warehouses.value = data.warehouses || []
    if (activeIdx.value >= warehouses.value.length) activeIdx.value = 0
    scene?.setWarehouse(active.value)
    updatedAt.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  } catch {
    // 错误已全局提示
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
  <div ref="wrapEl" class="relative h-full min-h-0 overflow-hidden rounded-xl border bg-[#eef2f8]">
    <canvas ref="canvasEl" class="block h-full w-full" />

    <!-- HUD 覆盖层 -->
    <div class="pointer-events-none absolute inset-0 p-4 text-slate-700">
      <!-- 顶部标题 + 库房选择 -->
      <div class="flex items-start justify-between gap-3">
        <div
          class="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sp backdrop-blur"
        >
          <div class="flex items-center gap-2">
            <span
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow"
            >
              <Warehouse class="h-5 w-5" />
            </span>
            <div>
              <h2 class="text-base font-semibold leading-tight text-slate-800">数字孪生库房</h2>
              <p class="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span class="relative flex h-2 w-2">
                  <span
                    class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
                  />
                  <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                库位占用实时映射 · 数据源自库存台账
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
        </div>

        <button
          class="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-600 shadow-sp backdrop-blur transition-colors hover:bg-white"
          @click="refresh"
        >
          <RefreshCw class="h-3.5 w-3.5" :class="loading && 'animate-spin'" />
          <span>{{ updatedAt || '刷新' }}</span>
        </button>
      </div>

      <!-- 右侧指标面板 -->
      <div class="absolute right-4 top-20 w-56 space-y-3">
        <div class="grid grid-cols-2 gap-2">
          <div class="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sp backdrop-blur">
            <div class="flex items-center gap-1 text-[11px] text-slate-500">
              <MapPin class="h-3 w-3" />库位总数
            </div>
            <div class="mt-0.5 text-xl font-semibold text-slate-800">
              {{ active?.summary.locationCount ?? 0 }}
            </div>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sp backdrop-blur">
            <div class="flex items-center gap-1 text-[11px] text-slate-500">
              <Layers class="h-3 w-3" />已占用
            </div>
            <div class="mt-0.5 text-xl font-semibold text-blue-600">
              {{ active?.summary.occupiedCount ?? 0 }}
            </div>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sp backdrop-blur">
            <div class="flex items-center gap-1 text-[11px] text-slate-500">
              <Gauge class="h-3 w-3" />占用率
            </div>
            <div class="mt-0.5 text-xl font-semibold text-indigo-600">
              {{ (active?.summary.occupancyRate ?? 0).toFixed(1)
              }}<span class="text-xs text-slate-400">%</span>
            </div>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sp backdrop-blur">
            <div class="flex items-center gap-1 text-[11px] text-slate-500">
              <Boxes class="h-3 w-3" />库存量
            </div>
            <div class="mt-0.5 text-xl font-semibold text-slate-800 tabular-nums">
              {{ Number(active?.summary.totalQty ?? 0).toFixed(0) }}
            </div>
          </div>
        </div>

        <!-- 悬停库位详情 -->
        <div class="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sp backdrop-blur">
          <div class="mb-1.5 text-xs font-medium text-slate-700">库位详情</div>
          <template v-if="hovered">
            <div class="font-mono text-sm text-slate-800">{{ hovered.code || '—' }}</div>
            <div class="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
              <span>组 {{ hovered.group }} · 排 {{ hovered.row }}</span>
              <span>层 {{ hovered.layer }} · 列 {{ hovered.column }}</span>
            </div>
            <div class="mt-1.5 flex items-center justify-between text-xs">
              <span
                class="rounded px-1.5 py-0.5 text-[10px]"
                :class="
                  hovered.disabled
                    ? 'bg-slate-200 text-slate-500'
                    : hovered.occupied
                      ? 'bg-blue-500/15 text-blue-600'
                      : 'bg-slate-100 text-slate-400'
                "
              >
                {{ hovered.disabled ? '禁用' : hovered.occupied ? '占用' : '空闲' }}
              </span>
              <span class="tabular-nums text-slate-700"
                >库存 {{ Number(hovered.qty || 0).toFixed(0) }}</span
              >
            </div>
            <div v-if="hovered.materiel" class="mt-1 truncate text-[11px] text-slate-500">
              {{ hovered.materiel }}
            </div>
          </template>
          <p v-else class="text-[11px] text-slate-400">移动鼠标悬停库位查看详情</p>
        </div>
      </div>

      <!-- 底部图例 -->
      <div
        class="absolute bottom-4 left-4 flex items-center gap-4 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-[11px] text-slate-600 shadow-sp backdrop-blur"
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
        <span class="ml-1 text-slate-400">拖拽旋转 · 滚轮缩放</span>
      </div>
    </div>

    <!-- 空态 -->
    <div
      v-if="!loading && !warehouses.length"
      class="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400"
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
