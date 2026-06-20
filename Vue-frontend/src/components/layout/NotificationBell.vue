<script setup lang="ts">
import { computed, ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import {
  Bell,
  BellRing,
  CheckCheck,
  Trash2,
  AlertTriangle,
  PackageCheck,
  Radio,
  Inbox,
  X,
} from 'lucide-vue-next'
import { useNotifyStore } from '@/stores/notify'
import type { NotifyMessage } from '@/types/domain'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const store = useNotifyStore()
const open = ref(false)
const root = ref<HTMLElement | null>(null)

onClickOutside(root, () => (open.value = false))

const hasUnread = computed(() => store.unread > 0)

function toggle() {
  open.value = !open.value
}

/** 每种通知类型的视觉令牌：图标 / 主题色 / 左侧强调条 */
const typeMeta: Record<
  NotifyMessage['type'],
  { icon: typeof Bell; label: string; accent: string; iconBg: string }
> = {
  alarm: {
    icon: AlertTriangle,
    label: '不良预警',
    accent: 'bg-destructive',
    iconBg: 'bg-destructive/10 text-destructive',
  },
  order: {
    icon: PackageCheck,
    label: '工序动态',
    accent: 'bg-primary',
    iconBg: 'bg-primary/10 text-primary',
  },
  system: {
    icon: Radio,
    label: '系统消息',
    accent: 'bg-muted-foreground',
    iconBg: 'bg-muted text-muted-foreground',
  },
  heartbeat: {
    icon: Radio,
    label: '产线心跳',
    accent: 'bg-muted-foreground',
    iconBg: 'bg-muted text-muted-foreground',
  },
}

function metaOf(type: NotifyMessage['type']) {
  return typeMeta[type] ?? typeMeta.system
}

function fromNow(time: string) {
  const d = dayjs(time)
  return d.isValid() ? d.fromNow() : time
}

function onItemClick(item: NotifyMessage) {
  store.markRead(item.id)
}
</script>

<template>
  <div ref="root" class="relative">
    <!-- 铃铛触发器 -->
    <button
      class="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      :title="store.connected ? '通知中心（实时在线）' : '通知中心（连接中…）'"
      @click="toggle"
    >
      <component
        :is="hasUnread ? BellRing : Bell"
        class="h-5 w-5"
        :class="hasUnread && 'text-foreground'"
      />
      <!-- 未读角标 -->
      <span
        v-if="hasUnread"
        class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground shadow-sm"
      >
        {{ store.badge }}
      </span>
      <!-- 在线脉冲点 -->
      <span
        v-else-if="store.connected"
        class="absolute right-1 top-1 flex h-2 w-2"
        aria-hidden="true"
      >
        <span
          class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
        />
        <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
    </button>

    <!-- 通知面板 -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="translate-y-1 scale-95 opacity-0"
      enter-to-class="translate-y-0 scale-100 opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="translate-y-0 scale-100 opacity-100"
      leave-to-class="translate-y-1 scale-95 opacity-0"
    >
      <div
        v-if="open"
        class="absolute right-0 z-50 mt-2 w-[360px] origin-top-right overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl"
      >
        <!-- 头部 -->
        <div class="flex items-center justify-between border-b px-4 py-3">
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold">通知中心</span>
            <span
              class="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              :class="
                store.connected
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground'
              "
            >
              <span
                class="h-1.5 w-1.5 rounded-full"
                :class="store.connected ? 'bg-emerald-500' : 'bg-muted-foreground'"
              />
              {{ store.connected ? '实时' : '连接中' }}
            </span>
          </div>
          <div class="flex items-center gap-0.5">
            <button
              class="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
              title="全部已读"
              :disabled="!hasUnread"
              @click="store.markAllRead()"
            >
              <CheckCheck class="h-4 w-4" />
            </button>
            <button
              class="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
              title="清空"
              :disabled="store.list.length === 0"
              @click="store.clear()"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- 列表 -->
        <div class="max-h-[380px] overflow-y-auto">
          <template v-if="store.list.length">
            <button
              v-for="item in store.list"
              :key="item.id"
              class="group relative flex w-full gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors last:border-0 hover:bg-accent/60"
              :class="!item.read && 'bg-primary/[0.04]'"
              @click="onItemClick(item)"
            >
              <!-- 左侧类型强调条 -->
              <span
                class="absolute inset-y-0 left-0 w-0.5"
                :class="metaOf(item.type).accent"
                :style="{ opacity: item.read ? 0.3 : 1 }"
              />
              <!-- 类型图标 -->
              <span
                class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                :class="metaOf(item.type).iconBg"
              >
                <component :is="metaOf(item.type).icon" class="h-4 w-4" />
              </span>
              <!-- 内容 -->
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-2">
                  <span class="truncate text-sm font-medium">{{ item.title }}</span>
                  <span class="shrink-0 text-[11px] text-muted-foreground">{{
                    fromNow(item.time)
                  }}</span>
                </div>
                <p class="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {{ item.content }}
                </p>
              </div>
              <!-- 未读点 -->
              <span
                v-if="!item.read"
                class="mt-1.5 h-2 w-2 shrink-0 self-start rounded-full bg-primary"
                aria-label="未读"
              />
              <!-- 移除按钮（悬停显示） -->
              <span
                class="absolute right-2 top-2 hidden rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground group-hover:block"
                title="移除"
                @click.stop="store.remove(item.id)"
              >
                <X class="h-3 w-3" />
              </span>
            </button>
          </template>

          <!-- 空态 -->
          <div
            v-else
            class="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center"
          >
            <span class="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Inbox class="h-6 w-6 text-muted-foreground" />
            </span>
            <p class="text-sm font-medium">暂无通知</p>
            <p class="text-xs text-muted-foreground">产线动态与预警将实时推送到这里</p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
