import { http } from '@/api/request'
import type { IPage } from '@/types/api'
import type { Warehouse, WarehouseRequest, WarehouseTransaction } from '@/types/domain'

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

/* ===================== 出入库管理（仓储中心 /warehouse） ===================== */

/** 出入库单分页（businessType: MANUAL_IN/PLAN_IN/MANUAL_OUT/KITTING_OUT；status: WAIT_CONFIRM/CONFIRMED） */
export function pageWarehouseRequests(params: Record<string, any>) {
  return http.post<IPage<WarehouseRequest>>('/warehouse/request/page', params)
}

/** 库存事务台账分页 */
export function pageWarehouseTransactions(params: Record<string, any>) {
  return http.post<IPage<WarehouseTransaction>>('/warehouse/transaction/page', params)
}
