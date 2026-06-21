<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Play,
  Flag,
  Truck,
  RefreshCw,
  LoaderCircle,
} from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import SpStatusBadge from '@/components/common/SpStatusBadge.vue'
import {
  getOrderDetail,
  approveOrder,
  startWorkOrder,
  completeOrder,
  deliverOrder,
} from '@/api/modules/order'
import { notify } from '@/lib/toast'
import { statueTone, orderTypeName } from '@/lib/orderStatus'
import { cn } from '@/lib/utils'
import type { Order } from '@/types/domain'

defineOptions({ name: 'OrderDetail' })

const route = useRoute()
const router = useRouter()
const id = route.params.id as string
// 从「审批中心」进入时仅做复核/审批，不展示动工/完工/交付等执行流转
const fromApproval = computed(() => route.query.from === 'approval')

const order = ref<Order | null>(null)
const loading = ref(true)
const acting = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await getOrderDetail(id)
    order.value = res.data ?? null
  } finally {
    loading.value = false
  }
}
useAutoRefresh(load)

// 生命周期步骤
const steps = computed(() => {
  const o = order.value
  if (!o) return []
  return [
    { key: 'create', label: '创建', done: true, time: o.createTime, by: o.designerName },
    {
      key: 'approve',
      label: '审批',
      done: (o.statue ?? 0) >= 2,
      time: o.approveTime,
      by: o.approveUsername,
    },
    { key: 'work', label: '动工', done: o.workStatus === 'STARTED', time: o.workStartTime, by: '' },
    {
      key: 'complete',
      label: '完工',
      done: o.completeStatus === 'COMPLETED',
      time: o.completeTime,
      by: o.completeUsername,
    },
    {
      key: 'deliver',
      label: '交付',
      done: o.deliveryStatus === 'DELIVERED',
      time: o.deliveryTime,
      by: o.deliveryUsername,
    },
  ]
})
const currentIdx = computed(() => {
  const arr = steps.value
  const i = arr.findIndex((s) => !s.done)
  return i === -1 ? arr.length : i
})

async function runAction(fn: (id: string) => Promise<any>, okMsg: string) {
  acting.value = true
  try {
    await fn(id)
    notify.success(okMsg)
    await load()
  } finally {
    acting.value = false
  }
}

const infoRows = computed(() => {
  const o = order.value
  if (!o) return []
  return [
    { label: '物料编码', value: o.materiel },
    { label: '物料名称', value: o.materielDesc },
    { label: '工单数量', value: o.qty },
    { label: '订单类型', value: orderTypeName(o.orderType) },
    { label: '计划开始', value: o.planStartTime },
    { label: '计划结束', value: o.planEndTime },
    { label: '设计人', value: o.designerName },
    { label: '审批人', value: o.approveUsername },
    { label: '来源订单', value: o.sourceOrderNo },
    {
      label: '来源BOM',
      value: o.sourceBomCode ? `${o.sourceBomCode} / ${o.sourceBomVersion ?? ''}` : '',
    },
  ]
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <Button variant="outline" size="sm" @click="router.push('/production/order')">
        <ArrowLeft class="h-4 w-4" />返回
      </Button>
      <h2 class="text-lg font-semibold">{{ order?.orderCode || '工单详情' }}</h2>
      <SpStatusBadge v-if="order" :tone="statueTone(order.statue)" :text="order.mainStatusName" />
      <Button variant="ghost" size="icon-sm" class="ml-auto" title="刷新" @click="load">
        <RefreshCw class="h-4 w-4" />
      </Button>
    </div>

    <!-- 加载骨架 -->
    <template v-if="loading">
      <Skeleton class="h-28 w-full" />
      <Skeleton class="h-64 w-full" />
    </template>

    <template v-else-if="order">
      <!-- 生命周期 -->
      <Card>
        <CardHeader><CardTitle class="text-base">生命周期</CardTitle></CardHeader>
        <CardContent>
          <div class="flex items-start">
            <template v-for="(step, i) in steps" :key="step.key">
              <div class="flex min-w-0 flex-1 flex-col items-center text-center">
                <div
                  :class="
                    cn(
                      'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-medium',
                      step.done
                        ? 'border-success bg-success text-white'
                        : i === currentIdx
                          ? 'border-primary text-primary'
                          : 'border-border text-muted-foreground',
                    )
                  "
                >
                  <Check v-if="step.done" class="h-5 w-5" />
                  <span v-else>{{ i + 1 }}</span>
                </div>
                <div class="mt-2 text-sm font-medium">{{ step.label }}</div>
                <div class="mt-0.5 text-xs text-muted-foreground">{{ step.time || '—' }}</div>
                <div v-if="step.by" class="text-xs text-muted-foreground">{{ step.by }}</div>
              </div>
              <div
                v-if="i < steps.length - 1"
                :class="
                  cn(
                    'mt-4 h-0.5 flex-1',
                    steps[i + 1].done || step.done ? 'bg-success' : 'bg-border',
                  )
                "
              />
            </template>
          </div>
        </CardContent>
      </Card>

      <!-- 操作 -->
      <Card>
        <CardHeader
          ><CardTitle class="text-base">{{ fromApproval ? '审批操作' : '流转操作' }}</CardTitle></CardHeader
        >
        <CardContent class="flex flex-wrap items-center gap-3">
          <Button
            v-if="order.statue === 1"
            :disabled="acting"
            @click="runAction(approveOrder, '审批通过')"
          >
            <LoaderCircle v-if="acting" class="h-4 w-4 animate-spin" />
            <CheckCircle2 v-else class="h-4 w-4" />审批通过
          </Button>
          <Button
            v-if="!fromApproval && order.statue !== 1 && order.workStatus !== 'STARTED'"
            variant="secondary"
            :disabled="acting"
            @click="runAction(startWorkOrder, '工单已动工')"
          >
            <Play class="h-4 w-4" />动工
          </Button>
          <Button
            v-if="!fromApproval && order.canComplete"
            variant="secondary"
            :disabled="acting"
            @click="runAction(completeOrder, '工单已完工')"
          >
            <Flag class="h-4 w-4" />完工
          </Button>
          <Button
            v-if="!fromApproval && order.canDeliver"
            :disabled="acting"
            @click="runAction(deliverOrder, '工单已交付')"
          >
            <Truck class="h-4 w-4" />交付
          </Button>
          <span
            v-if="fromApproval && order.statue !== 1"
            class="text-sm text-muted-foreground"
          >
            工单已审批，动工/完工/交付请在「生产工单」中操作
          </span>
          <span
            v-if="
              !fromApproval &&
              order.statue !== 1 &&
              order.workStatus === 'STARTED' &&
              !order.canComplete &&
              !order.canDeliver
            "
            class="text-sm text-muted-foreground"
          >
            {{ order.deliveryStatus === 'DELIVERED' ? '工单已交付，流程完成' : '无可执行操作' }}
          </span>
        </CardContent>
      </Card>

      <!-- 基本信息 -->
      <Card>
        <CardHeader><CardTitle class="text-base">基本信息</CardTitle></CardHeader>
        <CardContent class="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="row in infoRows"
            :key="row.label"
            class="flex justify-between gap-2 border-b pb-2 text-sm"
          >
            <span class="text-muted-foreground">{{ row.label }}</span>
            <span class="text-right font-medium">{{ row.value || '—' }}</span>
          </div>
        </CardContent>
      </Card>
    </template>

    <div v-else class="rounded-lg border bg-card p-12 text-center text-muted-foreground">
      工单不存在或已删除
    </div>
  </div>
</template>
