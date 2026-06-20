import { http } from '@/api/request'

/** 后端通知实体（sp_notification） */
export interface ServerNotification {
  id: string
  type?: string
  title?: string
  content?: string
  bizType?: string
  bizId?: string
  isRead?: string
  createTime?: string
}

export interface RecentNotifications {
  list: ServerNotification[]
  unread: number
}

/** 最近通知 + 未读数（全员 + 定向给当前用户） */
export function getRecentNotifications(limit = 30) {
  return http.post<RecentNotifications>('/notification/recent', { limit })
}

/** 标记单条已读 */
export function markNotificationRead(id: string) {
  return http.post('/notification/read', { id })
}

/** 全部标记已读 */
export function markAllNotificationsRead() {
  return http.post('/notification/read-all')
}
