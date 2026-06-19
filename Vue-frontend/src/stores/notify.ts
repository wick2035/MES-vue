import { defineStore } from 'pinia'
import type { NotifyMessage } from '@/types/domain'
import { notify as toastNotify } from '@/lib/toast'

/** 通知列表最大保留条数，超出丢弃最旧的，避免内存无限增长 */
const MAX_ITEMS = 60
/** 断线重连退避（毫秒）：逐次递增，封顶 15s */
const RECONNECT_STEPS = [1000, 2000, 4000, 8000, 15000]

// WebSocket 实例与重连定时器置于模块作用域，
// 避免被 Pinia 响应式代理（Socket 对象不应被 reactive 包裹）
let socket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempt = 0
/** 是否为用户主动断开（登出）——主动断开不再自动重连 */
let manualClosed = false

/** 构造同源 WebSocket 地址（经 Vite/反向代理转发到后端 /client/ws/notify） */
function resolveWsUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${location.host}/api/client/ws/notify`
}

/**
 * 实时通知状态：维护与后端的 WebSocket 长连接，
 * 接收 MES 产线动态（工序采集 / 不良预警 / 系统消息）并驱动头部通知中心。
 */
export const useNotifyStore = defineStore('notify', {
  state: () => ({
    /** 连接是否就绪 */
    connected: false,
    /** 通知列表（最新在前） */
    list: [] as NotifyMessage[],
  }),
  getters: {
    /** 未读数量 */
    unread: (state) => state.list.filter((n) => !n.read).length,
    /** 角标展示文本：超过 99 显示 99+ */
    badge(): string {
      return this.unread > 99 ? '99+' : String(this.unread)
    },
  },
  actions: {
    /** 建立连接（幂等：已连接或连接中则跳过） */
    connect() {
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return
      }
      manualClosed = false
      this.clearReconnect()
      try {
        socket = new WebSocket(resolveWsUrl())
      } catch {
        this.scheduleReconnect()
        return
      }

      socket.onopen = () => {
        this.connected = true
        reconnectAttempt = 0
      }

      socket.onmessage = (ev) => {
        let msg: NotifyMessage
        try {
          msg = JSON.parse(ev.data)
        } catch {
          return
        }
        this.receive(msg)
      }

      socket.onclose = () => {
        this.connected = false
        socket = null
        if (!manualClosed) this.scheduleReconnect()
      }

      socket.onerror = () => {
        // 错误后关闭，由 onclose 统一触发重连
        socket?.close()
      }
    },

    /** 处理收到的一条通知：入列 + 弹出对应等级的轻提示 */
    receive(msg: NotifyMessage) {
      const item: NotifyMessage = { ...msg, read: false }
      this.list.unshift(item)
      if (this.list.length > MAX_ITEMS) this.list.length = MAX_ITEMS
      this.toast(item)
    },

    /** 按类型映射到不同等级的全局提示（系统心跳类静默，避免打扰） */
    toast(msg: NotifyMessage) {
      const text = `${msg.title}：${msg.content}`
      if (msg.type === 'alarm') {
        toastNotify.error(text)
      } else if (msg.type === 'order') {
        toastNotify.info(text)
      } else if (msg.type === 'system' && msg.title === '连接成功') {
        toastNotify.success(msg.content)
      }
      // 其余 system（产线心跳/占位）仅入列、不弹提示
    },

    scheduleReconnect() {
      this.clearReconnect()
      const delay = RECONNECT_STEPS[Math.min(reconnectAttempt, RECONNECT_STEPS.length - 1)]
      reconnectAttempt += 1
      reconnectTimer = setTimeout(() => this.connect(), delay)
    },

    clearReconnect() {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    },

    /** 主动断开（登出时调用），不再自动重连 */
    disconnect() {
      manualClosed = true
      this.clearReconnect()
      reconnectAttempt = 0
      if (socket) {
        socket.onclose = null
        socket.onerror = null
        socket.close()
        socket = null
      }
      this.connected = false
    },

    markRead(id: string) {
      const item = this.list.find((n) => n.id === id)
      if (item) item.read = true
    },

    markAllRead() {
      this.list.forEach((n) => (n.read = true))
    },

    remove(id: string) {
      this.list = this.list.filter((n) => n.id !== id)
    },

    clear() {
      this.list = []
    },
  },
})
