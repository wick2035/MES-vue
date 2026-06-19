<script setup lang="ts">
import { computed } from 'vue'
import { use, registerTheme } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, PieChart, LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import { useAppStore } from '@/stores/app'

use([
  CanvasRenderer,
  BarChart,
  PieChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
])

const PALETTE = ['#2563EB', '#16A34A', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#DB2777', '#65A30D']

function axis(text: string, line: string, split: string) {
  return {
    axisLine: { lineStyle: { color: line } },
    axisTick: { lineStyle: { color: line } },
    axisLabel: { color: text },
    splitLine: { lineStyle: { color: split } },
  }
}
// 注册一次：亮色 / 暗色工业主题
registerTheme('mesLight', {
  color: PALETTE,
  backgroundColor: 'transparent',
  textStyle: { color: '#5B6573' },
  categoryAxis: axis('#5B6573', '#E5E8EC', '#EEF1F6'),
  valueAxis: axis('#5B6573', '#E5E8EC', '#EEF1F6'),
})
registerTheme('mesDark', {
  color: PALETTE,
  backgroundColor: 'transparent',
  textStyle: { color: '#94A3B8' },
  categoryAxis: axis('#94A3B8', '#334155', '#1E293B'),
  valueAxis: axis('#94A3B8', '#334155', '#1E293B'),
})

defineProps<{ option: EChartsOption }>()
const appStore = useAppStore()
const theme = computed(() => (appStore.theme === 'dark' ? 'mesDark' : 'mesLight'))
</script>

<template>
  <!-- 高度由父级传入的 class（如 h-72）决定，避免 h-full 在无高度父容器中塌陷为 0 -->
  <VChart :option="option" :theme="theme" autoresize />
</template>
