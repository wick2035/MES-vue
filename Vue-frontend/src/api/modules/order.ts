import { http } from '@/api/request'
import type { IPage } from '@/types/api'
import type { Order } from '@/types/domain'

const BASE = '/order/release'

export function pageOrders(params: Record<string, any>) {
  return http.post<IPage<Order>>(`${BASE}/page`, params)
}
export function getOrderDetail(id: string) {
  return http.post<Order>(`${BASE}/detail`, { id })
}
export function saveOrder(data: Order) {
  return http.post(`${BASE}/add-or-update`, data as Record<string, any>)
}
export function approveOrder(id: string) {
  return http.post(`${BASE}/approve`, { id })
}
export function rejectOrder(id: string, opinion?: string) {
  return http.post(`${BASE}/reject`, { id, opinion: opinion ?? '审批驳回' })
}
export function startWorkOrder(id: string) {
  return http.post(`${BASE}/start-work`, { id })
}
export function completeOrder(id: string) {
  return http.post(`${BASE}/complete`, { id })
}
export function deliverOrder(id: string) {
  return http.post(`${BASE}/deliver`, { id })
}
export function deleteOrder(id: string) {
  return http.post(`${BASE}/delete`, { id })
}
