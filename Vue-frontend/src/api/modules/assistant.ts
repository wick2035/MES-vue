import { http } from '@/api/request'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

/** 助手会话（后端 sp_llm_conversation） */
export interface LlmConversation {
  id: string
  title: string
  userId?: string
  createTime?: string
  updateTime?: string
}

/** 助手历史消息（后端 sp_llm_message，role：user / assistant） */
export interface LlmMessageDTO {
  id: string
  conversationId: string
  role: string
  content: string
  createTime?: string
}

/** 我的会话列表（按更新时间倒序） */
export function listConversations() {
  return http.post<LlmConversation[]>('/llm/chat/conversations')
}

/** 某会话的历史消息（按时间正序） */
export function getMessages(conversationId: string) {
  return http.post<LlmMessageDTO[]>('/llm/chat/messages', { conversationId })
}

/** 软删除会话 */
export function deleteConversation(conversationId: string) {
  return http.post('/llm/chat/delete-conversation', { conversationId })
}

/**
 * 构造 SSE 流地址（EventSource 用 GET 调用，经 Vite 代理同源携带会话 Cookie）。
 * 事件：meta(会话ID) / tool(调用的工具) / delta(增量文本) / done / error。
 */
export function streamUrl(message: string, conversationId?: string): string {
  const params = new URLSearchParams()
  params.set('message', message)
  if (conversationId) params.set('conversationId', conversationId)
  return `${API_BASE}/llm/chat/stream?${params.toString()}`
}
