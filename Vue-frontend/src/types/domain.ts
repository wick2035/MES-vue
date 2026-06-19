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
  remark?: string
}

/** 设备 */
export interface Equipment extends BaseEntity {
  equipmentCode?: string
  equipmentName?: string
  equipmentGroupId?: string
  status?: string
  remark?: string
}

/** 班组 */
export interface Team extends BaseEntity {
  teamCode?: string
  teamName?: string
  remark?: string
}

/** 库房 */
export interface Warehouse extends BaseEntity {
  warehouseCode?: string
  warehouseName?: string
  remark?: string
}

/** 库存 */
export interface Inventory extends BaseEntity {
  warehouseId?: string
  materielCode?: string
  materielDesc?: string
  qty?: number
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
