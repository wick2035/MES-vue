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
  /** DEMAND 需求 / FORECAST 预测 */
  sourceType?: string
  customerName?: string
  customerGroup?: string
  externalNo?: string
  salesContractNo?: string
  businessType?: string
  orderDate?: string
  settlementCurrency?: string
  transportMode?: string
  paymentTerms?: string
  taxRate?: string
  receiverName?: string
  receiverPhone?: string
  receiverAddress?: string
  /** REVERSE 逆向排产 / FORWARD 正向排产 */
  schedulingMethod?: string
  creationMethod?: string
  erpSourceNo?: string
  erpSyncTime?: string
  remark?: string
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

/** 生产订单产品明细行 */
export interface ProductionOrderItem extends BaseEntity {
  orderId?: string
  productMateriel?: string
  productName?: string
  bomId?: string
  bomCode?: string
  bomVersion?: string
  model?: string
  specification?: string
  qty?: number
  unitPrice?: number
  configuration?: string
  planDeliveryDate?: string
  planStartDate?: string
  leadTimeDays?: number
  targetCapacity?: number
  adjustNote?: string
  workOrderId?: string
  workOrderCode?: string
}

/** 生产订单计划下发阻断项 */
export interface DispatchBlocker {
  code: string
  message: string
  route: string
  actionText: string
}

/** MRP 物料需求计划明细 */
export interface MaterialRequirementPlan extends BaseEntity {
  productionOrderId?: string
  productionOrderNo?: string
  orderItemId?: string
  productMateriel?: string
  productName?: string
  materialId?: string
  materialCode?: string
  materialName?: string
  materialType?: string
  materialSource?: string
  unit?: string
  bomLevel?: number
  grossRequirement?: number
  availableStock?: number
  safetyStock?: number
  netRequirement?: number
  requirementDate?: string
  releaseDate?: string
  deliveryStatus?: string
  inboundStatus?: string
  inboundRequestId?: string
  inboundRequestNo?: string
  outboundStatus?: string
  outboundRequestId?: string
  outboundRequestNo?: string
  calcBatchNo?: string
  calcTime?: string
}

/** 生产订单工序派工行 */
export interface ProductionDispatchTask {
  operPlanId?: string
  orderNo?: string
  workOrderCode?: string
  productMateriel?: string
  productName?: string
  qty?: number
  operId?: string
  oper?: string
  operDesc?: string
  sortNum?: number
  unitId?: string
  unitName?: string
  planStartTime?: string
  planEndTime?: string
  durationHours?: number
  equipmentId?: string
  equipmentCode?: string
  equipmentName?: string
  equipmentStatus?: string
  teamId?: string
  teamName?: string
  userId?: string
  userName?: string
  employeeStatus?: string
}

/** 生产计划下发行 */
export interface ProductionDispatchRow {
  id?: string
  orderNo?: string
  customerName?: string
  itemCount?: number
  totalQty?: number
  firstProductName?: string
  firstProductMateriel?: string
  operationStatus?: string
  operationStatusName?: string
  mrpStatus?: string
}

/** 工作流审批任务 */
export interface WorkflowTask extends BaseEntity {
  instanceId?: string
  definitionId?: string
  businessType?: string
  businessId?: string
  businessCode?: string
  taskName?: string
  nodeKey?: string
  nodeName?: string
  assigneeType?: string
  assigneeId?: string
  assigneeName?: string
  status?: string
  action?: string
  opinion?: string
  startTime?: string
  completeTime?: string
  formName?: string
  formTitle?: string
  pcFormUrl?: string
  mobileFormUrl?: string
  allowReturn?: number
  allowTransfer?: number
  allowEntrust?: number
  allowRevoke?: number
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

/** 出入库单 */
export interface WarehouseRequest extends BaseEntity {
  requestNo?: string
  businessType?: string
  sourceNo?: string
  warehouseId?: string
  warehouseName?: string
  status?: string
  itemCount?: number
  totalQty?: number
  confirmedCount?: number
  applyUsername?: string
  applyTime?: string
  confirmUsername?: string
  confirmTime?: string
  remark?: string
}

/** 出入库单明细行 */
export interface WarehouseRequestItem extends BaseEntity {
  requestId?: string
  requestNo?: string
  businessType?: string
  materialId?: string
  materialCode?: string
  materialName?: string
  warehouseId?: string
  warehouseName?: string
  locationId?: string
  locationCode?: string
  batchNo?: string
  requestQty?: number
  confirmedQty?: number
  unit?: string
  status?: string
  sourceItemId?: string
  remark?: string
}

/** 库存事务台账 */
export interface WarehouseTransaction extends BaseEntity {
  transactionNo?: string
  requestNo?: string
  direction?: string
  businessType?: string
  warehouseId?: string
  warehouseName?: string
  materialId?: string
  materialCode?: string
  materialName?: string
  batchNo?: string
  qty?: number
  beforeQty?: number
  afterQty?: number
  operatorUsername?: string
  operateTime?: string
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
  remark?: string
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
  /** 关联子 BOM 的 ID（PG/COMP 子项有效，后端实际持久化字段） */
  childBomId?: string
  /** 关联子 BOM 编码（仅展示，后端联表带出） */
  childBomCode?: string
  /** 物料类型：FG 成品 / PG 半成品 / COMP 组件 / PART 零件 */
  itemMatType?: string
}

/** BOM 结构树节点（对齐后端 BomTreeNodeVO） */
export interface BomTreeNode {
  id: string
  pid?: string | null
  materielCode?: string
  materielDesc?: string
  matType?: string
  nodeCode?: string
  /** 产品 / 零部件 / 物料 */
  nodeType?: string
  level?: number
  itemNum?: number
  itemUnit?: string
  operTyper?: string
  lineNo?: string
  childBomId?: string
  updateTime?: string
  open?: boolean
  haveChild?: boolean
  children?: BomTreeNode[]
}

/** 零部件定义（产品 BOM 子项的合法来源） */
export interface ComponentDef extends BaseEntity {
  productName?: string
  componentCode?: string
  componentName?: string
  /** PG 半成品 / COMP 组件 */
  componentType?: string
  remark?: string
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

/** SN 工序采集记录 */
export interface SnRecord extends BaseEntity {
  sn?: string
  orderId?: string
  orderCode?: string
  flowId?: string
  operId?: string
  oper?: string
  operDesc?: string
  stepNo?: number
  /** OK / NG */
  status?: string
  remark?: string
}

/** SN 工艺路线执行状态 */
export interface SnRouteStep {
  operId: string
  oper?: string
  operDesc?: string
  stepNo?: number
  done?: boolean
  current?: boolean
}

/** 通用树节点（对齐后端 TreeVO） */
export interface TreeNode {
  id: string
  name: string
  checked?: boolean
  icon?: string
  type?: string
  url?: string
  children?: TreeNode[]
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
  processFlow: Array<{
    oper: string
    operDesc: string
    stepNo: number
    ok: number
    ng: number
    total: number
  }>
  achievement: Array<{
    orderCode: string
    desc: string
    planQty: number
    completedQty: number
    rate: number
  }>
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

/** 数字孪生库房：单个库位 */
export interface TwinLocation {
  code?: string
  group: number
  row: number
  layer: number
  column: number
  qty: number
  occupied: boolean
  disabled: boolean
  materiel?: string
  materialCode?: string
  batchNo?: string
  unit?: string
  capacityLevel?: 'EMPTY' | 'LOW' | 'MID' | 'HIGH' | 'DISABLED'
  statusText?: string
}

/** 数字孪生库房：单个库房 */
export interface TwinWarehouse {
  id: string
  code?: string
  name?: string
  type?: string
  dims: { group: number; row: number; layer: number; column: number }
  summary: {
    locationCount: number
    occupiedCount: number
    emptyCount: number
    disabledCount: number
    totalQty: number
    occupancyRate: number
    maxQty: number
  }
  locations: TwinLocation[]
}

/** 数字孪生库房聚合数据 */
export interface WarehouseTwinData {
  warehouses: TwinWarehouse[]
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
