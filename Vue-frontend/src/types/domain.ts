/**
 * 业务域类型定义，对齐后端实体（com.wangziyang.mes.*）。
 * 仅声明前端实际使用到的字段，避免与后端 1:1 冗余。
 */

/** 通用基础字段（BaseEntity） */
export interface BaseEntity {
  id?: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
  /** 软删：0 正常 / 1 删除 / 2 禁用 */
  deleted?: string
}

/** 系统用户 */
export interface SysUser extends BaseEntity {
  username?: string
  name?: string
  email?: string
  mobile?: string
  tel?: string
  sex?: string
  picId?: string
  deptId?: string
  status?: string
  roleNames?: string
  sysRoleDTOs?: SysRole[]
}

/** 角色 */
export interface SysRole extends BaseEntity {
  name?: string
  code?: string
  remark?: string
  sysMenuDtos?: SysMenu[]
}

/** 菜单（树节点） */
export interface SysMenu extends BaseEntity {
  name?: string
  url?: string
  icon?: string
  parentId?: string
  sort?: number
  type?: string
  children?: SysMenu[]
}

/** 物料 */
export interface Material extends BaseEntity {
  materiel?: string
  materielDesc?: string
  matType?: string
  matSource?: string
  unit?: string
  model?: string
  texture?: string
  leadTime?: number
  safetyStock?: number
  flowId?: string
  flowDesc?: string
  remark?: string
}

/** 生产工单 */
export interface Order extends BaseEntity {
  orderCode?: string
  orderDescription?: string
  qty?: number
  /** P 量产 / A 验证 / F 返工 */
  orderType?: string
  materiel?: string
  materielDesc?: string
  flowId?: string
  planStartTime?: string
  planEndTime?: string
  /** 1 创建 / 2 进行中 / 3 结束 / 4 终结 */
  statue?: number
  designerName?: string
  approveUsername?: string
  approveTime?: string
  workStatus?: string
  completeStatus?: string
  deliveryStatus?: string
  mainStatusName?: string
  approvalStatusName?: string
  workStatusName?: string
  completeStatusName?: string
  deliveryStatusName?: string
  dispatchStatusName?: string
  workStartTime?: string
  completeTime?: string
  completeUsername?: string
  deliveryTime?: string
  deliveryUsername?: string
  sourceOrderNo?: string
  sourceBomCode?: string
  sourceBomVersion?: string
  canComplete?: boolean
  canDeliver?: boolean
  completeBlockReason?: string
  deliveryBlockReason?: string
  remark?: string
}

/** 生产订单（计划层，工单的上游来源） */
export interface ProductionOrder extends BaseEntity {
  orderNo?: string
  sourceType?: string
  customerName?: string
  businessType?: string
  orderDate?: string
  status?: string
  approvalStatus?: string
  operationStatus?: string
  itemCount?: number
  totalQty?: number
  firstProductName?: string
  firstProductMateriel?: string
  firstPlanDeliveryDate?: string
  mrpStatus?: string
}

/** 设备 */
export interface Equipment extends BaseEntity {
  equipmentCode?: string
  equipmentName?: string
  equipmentModel?: string
  purpose?: string
  spec?: string
  equipmentGroupId?: string
  status?: string
  remark?: string
}

/** 班组 */
export interface Team extends BaseEntity {
  teamCode?: string
  teamName?: string
  teamDesc?: string
  remark?: string
}

/** 库房 */
export interface Warehouse extends BaseEntity {
  warehouseCode?: string
  warehouseName?: string
  warehouseType?: string
  warehouseDesc?: string
  specGroup?: number
  specRow?: number
  specLayer?: number
  specColumn?: number
  remark?: string
}

/** 库存 */
export interface Inventory extends BaseEntity {
  warehouseId?: string
  warehouseCode?: string
  warehouseName?: string
  locationId?: string
  locationCode?: string
  materielId?: string
  materielCode?: string
  materielDesc?: string
  batchNo?: string
  qty?: number
  unit?: string
  stockStatus?: string
}

/** BOM 头 */
export interface Bom extends BaseEntity {
  bomCode?: string
  materielCode?: string
  materielDesc?: string
  versionNumber?: string
  state?: string
  factory?: string
  bomLevel?: number
  lockStatus?: string
  validity?: string
}

/** BOM 子项 */
export interface BomItem extends BaseEntity {
  bomHeadId?: string
  materielItemCode?: string
  materielItemDesc?: string
  lineNo?: string
  itemNum?: number
  itemUnit?: string
  operTyper?: string
  childBomCode?: string
  itemMatType?: string
}

/** 工序 */
export interface Oper extends BaseEntity {
  oper?: string
  operDesc?: string
  unitId?: string
  operHours?: number
  manuCycle?: number
  genPlan?: string
  remark?: string
}

/** 流程/工艺路线 */
export interface Flow extends BaseEntity {
  flow?: string
  flowDesc?: string
  process?: string
}

/** 大屏聚合数据 */
export interface DashboardData {
  overview: {
    orderCount: number
    planQty: number
    completedQty: number
    inProcessQty: number
    scrappedQty: number
    yieldRate: number
    defectRate: number
  }
  orderStatus: {
    status: Array<{ name: string; value: number }>
    type: Array<{ name: string; value: number; qty: number }>
  }
  processFlow: Array<{ oper: string; operDesc: string; stepNo: number; ok: number; ng: number; total: number }>
  achievement: Array<{ orderCode: string; desc: string; planQty: number; completedQty: number; rate: number }>
  defect: {
    overallYield: number
    overallDefect: number
    perProcess: Array<{ operDesc: string; defectRate: number }>
  }
  inventory: {
    byWarehouse: Array<{ name: string; value: number }>
    topMateriel: Array<{ name: string; value: number }>
  }
  personnel: Array<{ name: string; value: number }>
}

/** 实时通知 */
export interface NotifyMessage {
  id: string
  type: 'order' | 'system' | 'alarm' | 'heartbeat'
  title: string
  content: string
  time: string
  read?: boolean
}
