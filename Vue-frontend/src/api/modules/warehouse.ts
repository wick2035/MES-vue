import { http } from '@/api/request'
import type { IPage } from '@/types/api'
import type {
  Warehouse,
  WarehouseRequest,
  WarehouseRequestItem,
  WarehouseTransaction,
} from '@/types/domain'

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

export function pageWarehouseRequestItems(params: Record<string, any>) {
  return http.post<IPage<WarehouseRequestItem>>('/warehouse/request/items', params)
}

export function applyWarehouseRequest(params: Record<string, any>) {
  return http.postJson('/warehouse/request/apply', params)
}

export interface AvailableLocation {
  id: string
  warehouseId?: string
  locationCode?: string
  empty?: boolean
  qty?: number
  materialCode?: string
}

export function availableLocations(params: {
  warehouseId: string
  materialId?: string
  locationCodeLike?: string
  direction?: 'IN' | 'OUT'
}) {
  return http.post<AvailableLocation[]>('/warehouse/common/available-locations', params)
}

export function confirmWarehouseItem(data: {
  itemId: string
  warehouseId?: string
  locationId?: string
  qty?: number
}) {
  return http.postJson('/warehouse/request/confirm-item', data)
}

export function syncPlanInboundRequests() {
  return http.post('/warehouse/plan-inbound/sync')
}

export function syncKittingOutboundRequests() {
  return http.post('/warehouse/kitting-outbound/sync')
}

export function precheckKittingOutbound(requestId: string) {
  return http.post('/warehouse/kitting-outbound/precheck', { requestId })
}

export function planInboundForKittingShortage(requestId: string) {
  return http.post('/warehouse/kitting-outbound/plan-inbound-shortage', { requestId })
}

export function confirmKittingOutboundRequest(requestId: string) {
  return http.post('/warehouse/kitting-outbound/confirm-request', { requestId })
}

/** 库存事务台账分页 */
export function pageWarehouseTransactions(params: Record<string, any>) {
  return http.post<IPage<WarehouseTransaction>>('/warehouse/transaction/page', params)
}
