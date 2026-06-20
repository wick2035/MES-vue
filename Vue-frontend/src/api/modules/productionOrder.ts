import { http } from '@/api/request'
import type { IPage } from '@/types/api'
import type {
  MaterialRequirementPlan,
  ProductionDispatchRow,
  ProductionDispatchTask,
  ProductionOrder,
  ProductionOrderItem,
} from '@/types/domain'

const BASE = '/production-order/plan'

/** 生产订单保存载荷（对齐后端 SpProductionOrderSaveReq） */
export interface ProductionOrderSavePayload {
  order: ProductionOrder
  items: ProductionOrderItem[]
}

export function pageProductionOrders(params: Record<string, any>) {
  return http.post<IPage<ProductionOrder>>(`${BASE}/page`, params)
}

/** 订单明细 */
export function getProductionOrderItems(id: string) {
  return http.post<ProductionOrderItem[]>(`${BASE}/items`, { id })
}

/** 保存草稿（@RequestBody，需 JSON） */
export function saveProductionOrder(payload: ProductionOrderSavePayload) {
  return http.postJson<string>(`${BASE}/add-or-update`, payload)
}

/** 提交生产主管审批并生成生产工单（@RequestBody，需 JSON） */
export function submitProductionOrder(payload: ProductionOrderSavePayload) {
  return http.postJson(`${BASE}/submit`, payload)
}

/** 直接确认（审批通过） */
export function confirmProductionOrder(id: string) {
  return http.post(`${BASE}/confirm`, { id })
}

/** 提交审批并生成生产工单（针对已存在订单） */
export function createWorkOrder(id: string) {
  return http.post(`${BASE}/create-work-order`, { id })
}

/** 生产计划下发 */
export function dispatchProductionOrder(id: string) {
  return http.post(`${BASE}/dispatch`, { id })
}

export function deleteProductionOrder(id: string) {
  return http.post(`${BASE}/delete`, { id })
}

export function pageProductionDispatch(params: Record<string, any>) {
  return http.post<IPage<ProductionDispatchRow>>('/production-order/dispatch/page', params)
}

export function pageEquipmentDispatch(params: Record<string, any>) {
  return http.post<IPage<ProductionDispatchTask>>(
    '/production-order/equipment-dispatch/page',
    params,
  )
}

export function pageEmployeeDispatch(params: Record<string, any>) {
  return http.post<IPage<ProductionDispatchTask>>(
    '/production-order/employee-dispatch/page',
    params,
  )
}

export function saveEquipmentDispatch(data: {
  operPlanId: string
  equipmentId: string
  remark?: string
}) {
  return http.post('/production-order/equipment-dispatch/save', data)
}

export function saveEmployeeDispatch(data: {
  operPlanId: string
  userId: string
  userName?: string
  teamId?: string
  teamName?: string
  remark?: string
}) {
  return http.post('/production-order/employee-dispatch/save', data)
}

export function getEmployeeCandidates(unitId: string) {
  return http.post<Record<string, any>[]>('/production-order/employee-dispatch/candidates', {
    unitId,
  })
}

export function calculateMaterialPlan(id: string) {
  return http.post('/production-order/material-plan/calculate', { id })
}

export function pageMaterialPlans(params: Record<string, any>) {
  return http.post<IPage<MaterialRequirementPlan>>('/production-order/material-plan/page', params)
}

export function releaseMaterialPlans(ids: string[]) {
  return http.postJson('/production-order/material-plan/release', { ids })
}

export function generateInboundRequest(ids: string[]) {
  return http.postJson('/production-order/material-plan/generate-inbound-request', { ids })
}

export function applyKittingOutbound(ids: string[]) {
  return http.postJson('/production-order/material-plan/apply-kitting-outbound-request', { ids })
}

export function generateKittingOutbound(ids: string[]) {
  return http.postJson('/production-order/material-plan/generate-kitting-outbound-request', { ids })
}
