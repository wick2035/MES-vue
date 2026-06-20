import { http } from '@/api/request'
import type { IPage } from '@/types/api'
import type { Bom, BomItem, Oper, Flow } from '@/types/domain'

// ===== BOM =====
export function pageBoms(params: Record<string, any>) {
  return http.post<IPage<Bom>>('/technology/bom/page', params)
}
export function getBomDetail(id: string) {
  return http.post<Bom>('/technology/bom/detail', { id })
}
export function listBomItems(bomHeadId: string) {
  return http.get<BomItem[]>('/technology/sp-bom-item/list-by-bom', { bomHeadId })
}
export function lockBom(id: string) {
  return http.post('/technology/bom/lock', { id })
}
export function deleteBom(id: string) {
  return http.post('/technology/bom/delete', { id })
}

// ===== 工序 Oper =====
export function pageOpers(params: Record<string, any>) {
  return http.post<IPage<Oper>>('/technology/oper/page', params)
}
export function saveOper(data: Oper) {
  return http.post('/technology/oper/add-or-update', data as Record<string, any>)
}
export function deleteOper(id: string) {
  return http.post('/technology/oper/delete', { id })
}

// ===== 流程/工艺路线 Flow =====
export function pageFlows(params: Record<string, any>) {
  return http.post<IPage<Flow>>('/basedata/flow/page', params)
}
