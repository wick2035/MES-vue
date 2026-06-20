<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Check, X, Boxes } from 'lucide-vue-next'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { pageSnRecords } from '@/api/modules/wip'
import { cn } from '@/lib/utils'
import type { SnRecord } from '@/types/domain'

defineOptions({ name: 'SnTrace' })

const route = useRoute()
const router = useRouter()
const sn = route.params.sn as string

const records = ref<SnRecord[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const res = await pageSnRecords({ snLike: sn, current: 1, size: 200 })
    const all = res.data?.records ?? []
    records.value = all.filter((r) => r.sn === sn).sort((a, b) => (a.stepNo ?? 0) - (b.stepNo ?? 0))
  } finally {
    loading.value = false
  }
}
onMounted(load)

const okCount = computed(() => records.value.filter((r) => r.status === 'OK').length)
const ngCount = computed(() => records.value.filter((r) => r.status === 'NG').length)
const orderCode = computed(() => records.value[0]?.orderCode || '—')
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <Button variant="outline" size="sm" @click="router.push('/wip/records')">
        <ArrowLeft class="h-4 w-4" />返回
      </Button>
      <h2 class="text-lg font-semibold">SN 追溯：{{ sn }}</h2>
      <Button variant="ghost" size="icon-sm" class="ml-auto" title="刷新" @click="load">
        <RefreshCw class="h-4 w-4" />
      </Button>
    </div>

    <!-- 概要 -->
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Card
        ><CardContent class="p-4">
          <div class="text-xs text-muted-foreground">所属工单</div>
          <div class="mt-1 truncate text-base font-semibold">{{ orderCode }}</div>
        </CardContent></Card
      >
      <Card
        ><CardContent class="p-4">
          <div class="text-xs text-muted-foreground">采集工序数</div>
          <div class="mt-1 text-base font-semibold">{{ records.length }}</div>
        </CardContent></Card
      >
      <Card
        ><CardContent class="p-4">
          <div class="text-xs text-muted-foreground">合格(OK)</div>
          <div class="mt-1 text-base font-semibold text-success">{{ okCount }}</div>
        </CardContent></Card
      >
      <Card
        ><CardContent class="p-4">
          <div class="text-xs text-muted-foreground">不良(NG)</div>
          <div class="mt-1 text-base font-semibold text-destructive">{{ ngCount }}</div>
        </CardContent></Card
      >
    </div>

    <Card>
      <CardContent class="p-6">
        <Skeleton v-if="loading" class="h-40 w-full" />
        <div
          v-else-if="records.length === 0"
          class="flex flex-col items-center gap-2 py-10 text-muted-foreground"
        >
          <Boxes class="h-8 w-8" />
          <span class="text-sm">该 SN 暂无采集记录</span>
        </div>
        <ol v-else class="relative border-l-2 border-border pl-6">
          <li v-for="(r, i) in records" :key="r.id ?? i" class="mb-6 last:mb-0">
            <span
              :class="
                cn(
                  'absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full text-white',
                  r.status === 'OK' ? 'bg-success' : 'bg-destructive',
                )
              "
            >
              <Check v-if="r.status === 'OK'" class="h-3 w-3" />
              <X v-else class="h-3 w-3" />
            </span>
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-medium">工序 {{ r.stepNo }} · {{ r.operDesc || r.oper }}</span>
              <span
                :class="
                  cn(
                    'rounded px-1.5 py-0.5 text-xs',
                    r.status === 'OK'
                      ? 'bg-success/10 text-success'
                      : 'bg-destructive/10 text-destructive',
                  )
                "
                >{{ r.status }}</span
              >
            </div>
            <div class="mt-0.5 text-xs text-muted-foreground">{{ r.createTime }}</div>
            <div v-if="r.remark" class="mt-0.5 text-xs text-muted-foreground">
              备注：{{ r.remark }}
            </div>
          </li>
        </ol>
      </CardContent>
    </Card>
  </div>
</template>
