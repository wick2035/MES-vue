<script setup lang="ts">
import { ref, reactive, nextTick, computed, onMounted, onBeforeUnmount, onActivated } from 'vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import {
  Bot,
  Plus,
  Trash2,
  Send,
  Square,
  Sparkles,
  BarChart3,
  PackageSearch,
  ClipboardList,
  AlertTriangle,
  MessageSquare,
  Wrench,
} from 'lucide-vue-next'
import {
  listConversations,
  getMessages,
  deleteConversation,
  streamUrl,
  type LlmConversation,
} from '@/api/modules/assistant'
import { renderMarkdown } from '@/lib/markdown'
import { notify } from '@/lib/toast'

defineOptions({ name: 'Assistant' })
dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  tools?: string[]
  streaming?: boolean
}

const conversations = ref<LlmConversation[]>([])
const currentId = ref<string | null>(null)
const messages = ref<ChatMessage[]>([])
const input = ref('')
const streaming = ref(false)
const loadingHistory = ref(false)
const scrollEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLTextAreaElement | null>(null)
let es: EventSource | null = null

const suggestions = [
  { icon: ClipboardList, text: '当前有哪些超期未完成的生产工单？' },
  { icon: BarChart3, text: '统计各工序的报工合格率' },
  { icon: PackageSearch, text: '查询库存低于安全库存的物料' },
  { icon: AlertTriangle, text: '如何创建并下发一个生产工单？' },
]

const canSend = computed(() => input.value.trim().length > 0 && !streaming.value)
const isEmpty = computed(() => messages.value.length === 0)

function uid() {
  return `c${Date.now()}${Math.random().toString(16).slice(2, 8)}`
}

function scrollToBottom() {
  nextTick(() => {
    const el = scrollEl.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

async function refreshConversations() {
  try {
    const { data } = await listConversations()
    conversations.value = data || []
  } catch {
    // 列表非关键，失败静默
  }
}

async function selectConversation(id: string) {
  if (streaming.value || id === currentId.value) return
  currentId.value = id
  loadingHistory.value = true
  try {
    const { data } = await getMessages(id)
    messages.value = (data || [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content }))
  } catch {
    messages.value = []
  } finally {
    loadingHistory.value = false
    scrollToBottom()
  }
}

function newChat() {
  if (streaming.value) return
  currentId.value = null
  messages.value = []
  input.value = ''
  nextTick(() => inputEl.value?.focus())
}

async function removeConversation(id: string, e: Event) {
  e.stopPropagation()
  try {
    await deleteConversation(id)
    conversations.value = conversations.value.filter((c) => c.id !== id)
    if (currentId.value === id) newChat()
    notify.success('会话已删除')
  } catch {
    // 错误已全局提示
  }
}

function autoGrow() {
  const el = inputEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

function useSuggestion(text: string) {
  if (streaming.value) return
  input.value = text
  nextTick(() => {
    autoGrow()
    send()
  })
}

function send() {
  const text = input.value.trim()
  if (!text || streaming.value) return

  messages.value.push({ id: uid(), role: 'user', content: text })
  const assistant = reactive<ChatMessage>({
    id: uid(),
    role: 'assistant',
    content: '',
    tools: [],
    streaming: true,
  })
  messages.value.push(assistant)
  input.value = ''
  nextTick(autoGrow)
  streaming.value = true
  scrollToBottom()

  es = new EventSource(streamUrl(text, currentId.value || undefined))

  es.addEventListener('meta', (ev) => {
    try {
      const d = JSON.parse((ev as MessageEvent).data)
      if (d.conversationId && !currentId.value) {
        currentId.value = d.conversationId
        refreshConversations()
      }
    } catch {
      // ignore
    }
  })
  es.addEventListener('tool', (ev) => {
    try {
      assistant.tools = JSON.parse((ev as MessageEvent).data).tools || []
    } catch {
      // ignore
    }
  })
  es.addEventListener('delta', (ev) => {
    try {
      assistant.content += JSON.parse((ev as MessageEvent).data).c || ''
      scrollToBottom()
    } catch {
      // ignore
    }
  })
  es.addEventListener('done', () => finish(assistant))
  es.addEventListener('error', (ev) => {
    const me = ev as MessageEvent
    if (me.data) {
      try {
        const d = JSON.parse(me.data)
        assistant.content += (assistant.content ? '\n\n' : '') + `> ⚠️ ${d.message}`
      } catch {
        // ignore
      }
    } else if (!assistant.content && !assistant.tools?.length) {
      assistant.content = '> ⚠️ 连接中断，请稍后重试。'
    }
    finish(assistant)
  })
}

function finish(assistant: ChatMessage) {
  assistant.streaming = false
  streaming.value = false
  es?.close()
  es = null
  if (currentId.value) refreshConversations()
  scrollToBottom()
}

function stop() {
  es?.close()
  es = null
  const last = messages.value[messages.value.length - 1]
  if (last && last.role === 'assistant') last.streaming = false
  streaming.value = false
}

function fromNow(t?: string) {
  if (!t) return ''
  const d = dayjs(t)
  return d.isValid() ? d.fromNow() : ''
}

onMounted(() => {
  refreshConversations()
  nextTick(() => inputEl.value?.focus())
})
onActivated(() => scrollToBottom())
onBeforeUnmount(() => {
  es?.close()
  es = null
})
</script>

<template>
  <div class="flex h-full min-h-0 gap-4">
    <!-- 会话列表 -->
    <aside class="hidden w-64 shrink-0 flex-col rounded-xl border bg-card shadow-sp md:flex">
      <div class="p-3">
        <button
          class="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          :disabled="streaming"
          @click="newChat"
        >
          <Plus class="h-4 w-4" />新对话
        </button>
      </div>
      <div class="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        <p v-if="!conversations.length" class="px-2 py-6 text-center text-xs text-muted-foreground">
          暂无历史会话
        </p>
        <button
          v-for="conv in conversations"
          :key="conv.id"
          class="group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors"
          :class="
            conv.id === currentId
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
          "
          @click="selectConversation(conv.id)"
        >
          <MessageSquare class="h-4 w-4 shrink-0 opacity-70" />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm">{{ conv.title || '新对话' }}</span>
            <span class="block text-[11px] text-muted-foreground">{{ fromNow(conv.updateTime) }}</span>
          </span>
          <span
            class="hidden rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive group-hover:block"
            title="删除会话"
            @click="removeConversation(conv.id, $event)"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </span>
        </button>
      </div>
    </aside>

    <!-- 对话主区 -->
    <section class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sp">
      <!-- 头部 -->
      <header class="flex items-center gap-3 border-b px-4 py-3">
        <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-sm">
          <Bot class="h-5 w-5" />
        </span>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5 text-sm font-semibold">
            MES 智能助手
            <span class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              <Sparkles class="h-3 w-3" />通义千问
            </span>
          </div>
          <p class="truncate text-xs text-muted-foreground">基于真实业务数据问答 · 工序质量 / 工单 / 库存 / 操作指引</p>
        </div>
      </header>

      <!-- 消息区 -->
      <div ref="scrollEl" class="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <!-- 空态：欢迎 + 建议提问 -->
        <div v-if="isEmpty && !loadingHistory" class="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
          <span class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/50 text-primary-foreground shadow-lg">
            <Bot class="h-8 w-8" />
          </span>
          <h2 class="text-xl font-semibold">你好，我是 MES 智能助手</h2>
          <p class="mt-1.5 max-w-md text-sm text-muted-foreground">
            我能查询真实的工单、库存、质量与 SN 追溯数据，也能解答系统操作与业务流程问题。试试这些：
          </p>
          <div class="mt-6 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              v-for="(s, i) in suggestions"
              :key="i"
              class="flex items-center gap-3 rounded-xl border bg-background/60 px-4 py-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent"
              @click="useSuggestion(s.text)"
            >
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <component :is="s.icon" class="h-4 w-4" />
              </span>
              <span class="text-foreground/90">{{ s.text }}</span>
            </button>
          </div>
        </div>

        <!-- 历史加载骨架 -->
        <div v-else-if="loadingHistory" class="space-y-4">
          <div v-for="i in 3" :key="i" class="h-16 animate-pulse rounded-xl bg-muted/60" />
        </div>

        <!-- 消息列表 -->
        <div v-else class="mx-auto max-w-3xl space-y-5">
          <div
            v-for="m in messages"
            :key="m.id"
            class="flex gap-3"
            :class="m.role === 'user' ? 'flex-row-reverse' : ''"
          >
            <!-- 头像 -->
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm"
              :class="
                m.role === 'user'
                  ? 'bg-foreground/5 text-foreground'
                  : 'bg-gradient-to-br from-primary to-primary/60 text-primary-foreground'
              "
            >
              <Bot v-if="m.role === 'assistant'" class="h-4 w-4" />
              <span v-else class="text-xs font-semibold">我</span>
            </span>

            <!-- 气泡 -->
            <div class="min-w-0 max-w-[85%]" :class="m.role === 'user' ? 'items-end' : ''">
              <!-- 工具调用提示 -->
              <div
                v-if="m.role === 'assistant' && m.tools && m.tools.length"
                class="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400"
              >
                <Wrench class="h-3 w-3" :class="m.streaming && 'animate-pulse'" />
                正在查询：{{ m.tools.join('、') }}
              </div>

              <!-- 用户气泡 -->
              <div
                v-if="m.role === 'user'"
                class="whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground shadow-sm"
              >
                {{ m.content }}
              </div>

              <!-- 助手气泡 -->
              <div
                v-else
                class="rounded-2xl rounded-tl-sm border bg-background/60 px-4 py-3 text-sm leading-relaxed shadow-sm"
              >
                <!-- 思考中：内容尚空 -->
                <div v-if="!m.content && m.streaming" class="flex items-center gap-1 py-1">
                  <span class="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.3s]" />
                  <span class="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.15s]" />
                  <span class="h-2 w-2 animate-bounce rounded-full bg-primary/60" />
                </div>
                <div v-else class="md-body" v-html="renderMarkdown(m.content)" />
                <!-- 流式光标 -->
                <span v-if="m.streaming && m.content" class="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-primary align-text-bottom" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区 -->
      <footer class="border-t p-3">
        <div class="flex items-end gap-2 rounded-2xl border bg-background px-3 py-2 transition-colors focus-within:border-primary/50">
          <textarea
            ref="inputEl"
            v-model="input"
            rows="1"
            placeholder="输入问题，Enter 发送 / Shift+Enter 换行…"
            class="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
            @input="autoGrow"
            @keydown="onKeydown"
          />
          <button
            v-if="streaming"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
            title="停止生成"
            @click="stop"
          >
            <Square class="h-4 w-4" />
          </button>
          <button
            v-else
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
            title="发送"
            :disabled="!canSend"
            @click="send"
          >
            <Send class="h-4 w-4" />
          </button>
        </div>
        <p class="mt-1.5 px-1 text-center text-[11px] text-muted-foreground">
          回答由 AI 生成并基于真实业务数据，关键决策请人工复核
        </p>
      </footer>
    </section>
  </div>
</template>

<style scoped>
/* Markdown 正文样式（v-html 内容需用 :deep 穿透 scoped） */
.md-body :deep(p) {
  margin: 0.35rem 0;
}
.md-body :deep(p:first-child) {
  margin-top: 0;
}
.md-body :deep(p:last-child) {
  margin-bottom: 0;
}
.md-body :deep(h1),
.md-body :deep(h2),
.md-body :deep(h3) {
  margin: 0.6rem 0 0.4rem;
  font-weight: 600;
  line-height: 1.3;
}
.md-body :deep(h1) {
  font-size: 1.15rem;
}
.md-body :deep(h2) {
  font-size: 1.05rem;
}
.md-body :deep(h3) {
  font-size: 1rem;
}
.md-body :deep(ul),
.md-body :deep(ol) {
  margin: 0.4rem 0;
  padding-left: 1.25rem;
}
.md-body :deep(li) {
  margin: 0.2rem 0;
}
.md-body :deep(ul) {
  list-style: disc;
}
.md-body :deep(ol) {
  list-style: decimal;
}
.md-body :deep(a) {
  color: hsl(var(--primary));
  text-decoration: underline;
  text-underline-offset: 2px;
}
.md-body :deep(strong) {
  font-weight: 600;
}
.md-body :deep(code) {
  border-radius: 0.25rem;
  background: hsl(var(--muted));
  padding: 0.1rem 0.35rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85em;
}
.md-body :deep(pre) {
  margin: 0.5rem 0;
  overflow-x: auto;
  border-radius: 0.5rem;
  background: hsl(var(--muted));
  padding: 0.75rem 0.9rem;
}
.md-body :deep(pre code) {
  background: transparent;
  padding: 0;
}
.md-body :deep(blockquote) {
  margin: 0.5rem 0;
  border-left: 3px solid hsl(var(--border));
  padding-left: 0.75rem;
  color: hsl(var(--muted-foreground));
}
.md-body :deep(table) {
  margin: 0.5rem 0;
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}
.md-body :deep(th),
.md-body :deep(td) {
  border: 1px solid hsl(var(--border));
  padding: 0.4rem 0.6rem;
  text-align: left;
}
.md-body :deep(th) {
  background: hsl(var(--muted));
  font-weight: 600;
}
.md-body :deep(tbody tr:nth-child(even)) {
  background: hsl(var(--muted) / 0.4);
}
.md-body :deep(hr) {
  margin: 0.75rem 0;
  border: none;
  border-top: 1px solid hsl(var(--border));
}
</style>
