<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import {
  Boxes,
  Gauge,
  Activity,
  AlertTriangle,
  RefreshCw,
  Factory,
  Radio,
  Loader2,
} from 'lucide-vue-next'
import { getDashboardData } from '@/api/modules/dashboard'
import { ProductionTwinScene, type TwinStation } from '@/lib/twin/scene'
import type { DashboardData } from '@/types/domain'
import { notify } from '@/lib/toast'

defineOptions({ name: 'DigitalTwin' })

const canvasEl = ref<HTMLCanvasElement | null>(null)
const wrapEl = ref<HTMLElement | null>(null)
const loading = ref(true)
const firstLoad = ref(true)
const updatedAt = ref('')
const overview = ref<DashboardData['overview'] | null>(null)
const stations = ref<TwinStation[]>([])

let scene: ProductionTwinScene | null = null
let ro: ResizeObserver | null = null
let timer: ReturnType<typeof setInterval> | null = null

const statusText: Record<TwinStation['status'], string> = {
  running: '运行中',
  idle: '待机',
  alarm: '告警',
}
const statusDot: Record<TwinStation['status'], string> = {
  running: 'bg-emerald-400',
  idle: 'bg-slate-400',
  alarm: 'bg-red-400',
}

const runningCount = computed(() => stations.value.filter((s) => s.status === 'running').length)
const alarmCount = computed(() => stations.value.filter((s) => s.status === 'alarm').length)

/** 由工序流真实数据派生工位状态 */
function deriveStations(pf: DashboardData['processFlow']): TwinStation[] {
  return [...pf]
    .sort((a, b) => a.stepNo - b.stepNo)
    .map((p) => {
      const yieldRate = p.total > 0 ? (p.ok / p.total) * 100 : 0
      let status: TwinStation['status'] = 'idle'
      if (p.total > 0) status = p.ng > 0 && yieldRate < 90 ? 'alarm' : 'running'
      return { ...p, status, yieldRate }
    })
}

async function load() {
  loading.value = true
  try {
    const { data } = await getDashboardData()
    overview.value = data.overview
    stations.value = deriveStations(data.processFlow || [])
    scene?.setStations(stations.value)
    updatedAt.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  } catch {
    // 错误已全局提示
  } finally {
    loading.value = false
    firstLoad.value = false
  }
}

function refresh() {
  load().then(() => notify.success('孪生数据已刷新'))
}

onMounted(async () => {
  if (canvasEl.value && wrapEl.value) {
    scene = new ProductionTwinScene()
    scene.init(canvasEl.value, wrapEl.value)
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
  <div
    ref="wrapEl"
    class="relative h-full min-h-0 overflow-hidden rounded-xl border"
    style="background: radial-gradient(120% 120% at 50% 0%, #14224e 0%, #0a1124 55%, #070b1a 100%)"
  >
    <canvas ref="canvasEl" class="block h-full w-full" />

    <!-- HUD 覆盖层（不拦截鼠标，便于旋转场景） -->
    <div class="pointer-events-none absolute inset-0 p-4 text-slate-100">
      <!-- 顶部标题 -->
      <div class="flex items-start justify-between gap-3">
        <div class="rounded-xl border border-white/10 bg-slate-900/55 px-4 py-3 shadow-lg backdrop-blur">
          <div class="flex items-center gap-2">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow">
              <Factory class="h-5 w-5" />
            </span>
            <div>
              <h2 class="text-base font-semibold leading-tight">智能产线数字孪生</h2>
              <p class="flex items-center gap-1.5 text-[11px] text-slate-300">
                <span class="relative flex h-2 w-2">
                  <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                实时映射工序状态 · 数据源自工序采集
              </p>
            </div>
          </div>
        </div>

        <button
          class="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/55 px-3 py-2 text-xs text-slate-200 shadow-lg backdrop-blur transition-colors hover:bg-slate-800/70"
          @click="refresh"
        >
          <RefreshCw class="h-3.5 w-3.5" :class="loading && 'animate-spin'" />
          <span>{{ updatedAt || '刷新' }}</span>
        </button>
      </div>

      <!-- 右侧指标面板 -->
      <div class="absolute right-4 top-20 w-60 space-y-3">
        <div class="grid grid-cols-2 gap-2">
          <div class="rounded-xl border border-white/10 bg-slate-900/55 p-3 shadow-lg backdrop-blur">
            <div class="flex items-center gap-1 text-[11px] text-slate-300"><Activity class="h-3 w-3" />运行工位</div>
            <div class="mt-0.5 text-xl font-semibold text-emerald-400">{{ runningCount }}<span class="text-xs text-slate-400">/{{ stations.length }}</span></div>
          </div>
          <div class="rounded-xl border border-white/10 bg-slate-900/55 p-3 shadow-lg backdrop-blur">
            <div class="flex items-center gap-1 text-[11px] text-slate-300"><Gauge class="h-3 w-3" />实时良率</div>
            <div class="mt-0.5 text-xl font-semibold text-sky-400">{{ (overview?.yieldRate ?? 0).toFixed(1) }}<span class="text-xs text-slate-400">%</span></div>
          </div>
          <div class="rounded-xl border border-white/10 bg-slate-900/55 p-3 shadow-lg backdrop-blur">
            <div class="flex items-center gap-1 text-[11px] text-slate-300"><Boxes class="h-3 w-3" />在制数量</div>
            <div class="mt-0.5 text-xl font-semibold text-indigo-300">{{ overview?.inProcessQty ?? 0 }}</div>
          </div>
          <div class="rounded-xl border border-white/10 bg-slate-900/55 p-3 shadow-lg backdrop-blur">
            <div class="flex items-center gap-1 text-[11px] text-slate-300"><AlertTriangle class="h-3 w-3" />告警工位</div>
            <div class="mt-0.5 text-xl font-semibold" :class="alarmCount ? 'text-red-400' : 'text-slate-200'">{{ alarmCount }}</div>
          </div>
        </div>

        <!-- 工位状态列表 -->
        <div class="rounded-xl border border-white/10 bg-slate-900/55 shadow-lg backdrop-blur">
          <div class="flex items-center gap-1.5 border-b border-white/10 px-3 py-2 text-xs font-medium text-slate-200">
            <Radio class="h-3.5 w-3.5" />工位状态
          </div>
          <div class="max-h-64 space-y-0.5 overflow-y-auto p-1.5">
            <div
              v-for="s in stations"
              :key="s.oper"
              class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-white/5"
            >
              <span class="h-2 w-2 shrink-0 rounded-full" :class="statusDot[s.status]" />
              <span class="min-w-0 flex-1 truncate text-slate-200">{{ s.operDesc || s.oper }}</span>
              <span class="shrink-0 tabular-nums text-slate-400">{{ s.yieldRate.toFixed(0) }}%</span>
              <span
                class="shrink-0 rounded px-1.5 py-0.5 text-[10px]"
                :class="{
                  'bg-emerald-500/15 text-emerald-300': s.status === 'running',
                  'bg-slate-500/15 text-slate-300': s.status === 'idle',
                  'bg-red-500/15 text-red-300': s.status === 'alarm',
                }"
              >
                {{ statusText[s.status] }}
              </span>
            </div>
            <p v-if="!stations.length && !loading" class="px-2 py-6 text-center text-xs text-slate-400">
              暂无工序采集数据
            </p>
          </div>
        </div>
      </div>

      <!-- 底部图例 -->
      <div class="absolute bottom-4 left-4 flex items-center gap-4 rounded-lg border border-white/10 bg-slate-900/55 px-3 py-2 text-[11px] text-slate-300 shadow-lg backdrop-blur">
        <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-emerald-400" />运行</span>
        <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-slate-400" />待机</span>
        <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-red-400" />告警</span>
        <span class="ml-1 text-slate-500">拖拽旋转 · 滚轮缩放</span>
      </div>
    </div>

    <!-- 首屏加载 -->
    <div
      v-if="loading && firstLoad"
      class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a1124]/60 text-slate-200 backdrop-blur-sm"
    >
      <Loader2 class="h-7 w-7 animate-spin text-sky-400" />
      <p class="text-sm">正在构建数字孪生场景…</p>
    </div>
  </div>
</template>
