import { http } from '@/api/request'
import type { IPage } from '@/types/api'
import type {
  Bom,
  BomItem,
  BomTreeNode,
  ComponentDef,
  Oper,
  Flow,
  FlowStep,
  ProcessingUnit,
} from '@/types/domain'

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
/** 事务性保存 BOM 头 + 全部子项（后端最严校验，对应 /save-with-items） */
export function saveBomWithItems(header: Partial<Bom>, items: Partial<BomItem>[]) {
  return http.post('/technology/bom/save-with-items', {
    ...(header as Record<string, any>),
    itemsJson: JSON.stringify(items ?? []),
  })
}
/** 获取完整 BOM 结构树 */
export function getBomTree(bomId: string) {
  return http.get<BomTreeNode>('/technology/bom/tree-data', { bomId })
}
/** 可选子 BOM（已定版且有效，按子项类型过滤层级） */
export function listSelectableBoms(itemMatType?: string, itemCode?: string) {
  return http.get<Bom[]>('/technology/bom/selectable-boms', { itemMatType, itemCode })
}
/** 按产品查询已启用零部件（产品 BOM 子项来源） */
export function listSelectableComponents(productName?: string, componentType?: string) {
  return http.get<ComponentDef[]>('/technology/component/selectable', { productName, componentType })
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
/** 全部工序（工艺路线步骤选择器用） */
export function listOpers() {
  return http.get<Oper[]>('/technology/oper/list')
}
/** 加工单元下拉数据源（仅正常状态） */
export function listProcessingUnits() {
  return http.get<ProcessingUnit[]>('/basedata/processing-unit/list')
}

// ===== 流程/工艺路线 Flow =====
export function pageFlows(params: Record<string, any>) {
  return http.post<IPage<Flow>>('/basedata/flow/page', params)
}
export function saveFlow(data: Partial<Flow>) {
  return http.post('/basedata/flow/add-or-update', data as Record<string, any>)
}
export function deleteFlow(id: string) {
  return http.post('/basedata/flow/delete', { id })
}
/** 工艺路线头信息（单条） */
export function getFlow(id: string) {
  return http.get<Flow>('/basedata/flow/detail', { id })
}
/** 某工艺路线的有序步骤（继承部门/班组/加工单元） */
export function getFlowSteps(flowId: string) {
  return http.get<FlowStep[]>('/basedata/flow/process/steps', { flowId })
}
/** 按有序工序ID列表保存步骤（重建关系表，不覆盖 process 备注） */
export function saveFlowSteps(flowId: string, operIds: string[]) {
  return http.post('/basedata/flow/process/save-steps', {
    flowId,
    operIdsJson: JSON.stringify(operIds ?? []),
  })
}

// ===== BOM 写操作 =====
export function saveBom(data: Partial<Bom>) {
  return http.post('/technology/bom/add-or-update', data as Record<string, any>)
}
export function saveBomItem(data: Partial<BomItem>) {
  return http.post('/technology/sp-bom-item/add-or-update', data as Record<string, any>)
}
export function deleteBomItem(id: string) {
  return http.post('/technology/sp-bom-item/delete', { id })
}
