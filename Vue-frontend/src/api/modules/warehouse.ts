import { http } from '@/api/request'
import type { IPage } from '@/types/api'
import type { Warehouse } from '@/types/domain'

const BASE = '/basedata/warehouse'

export function pageWarehouses(params: Record<string, any>) {
  return http.post<IPage<Warehouse>>(`${BASE}/page`, params)
}
export function saveWarehouse(data: Warehouse) {
  return http.post(`${BASE}/add-or-update`, data as Record<string, any>)
}
export function deleteWarehouse(id: string) {
  return http.post(`${BASE}/delete`, { id })
}
