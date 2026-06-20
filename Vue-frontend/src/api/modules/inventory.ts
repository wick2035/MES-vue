import { http } from '@/api/request'
import type { IPage } from '@/types/api'
import type { Inventory } from '@/types/domain'

const BASE = '/basedata/inventory'

export function pageInventories(params: Record<string, any>) {
  return http.post<IPage<Inventory>>(`${BASE}/page`, params)
}
/** 出库（软删一条库存记录） */
export function deleteInventory(id: string) {
  return http.post(`${BASE}/delete`, { id })
}
