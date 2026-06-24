import type { ProductionOrder } from '@/types/domain'

export type ProductionOrderActionKey =
  | 'view'
  | 'edit'
  | 'confirm'
  | 'submit'
  | 'materialPlan'
  | 'equipmentDispatch'
  | 'employeeDispatch'
  | 'dispatch'
  | 'delete'

export interface ProductionOrderAction {
  key: ProductionOrderActionKey
}

const firstStepActions: ProductionOrderActionKey[] = ['edit', 'confirm', 'submit']
const assignmentActions: ProductionOrderActionKey[] = ['equipmentDispatch', 'employeeDispatch']

function isFirstStep(row: ProductionOrder) {
  return (
    row.approvalStatus !== 'APPROVING' &&
    row.approvalStatus !== 'APPROVED' &&
    row.status !== 'WORK_ORDER_CREATED' &&
    row.status !== 'CANCELLED'
  )
}

// 待派工：已审批、设备/员工派工尚未全部完成
function isAssignmentStep(row: ProductionOrder) {
  return (
    row.approvalStatus === 'APPROVED' &&
    (row.operationStatus === 'WAIT_CALC' || row.operationStatus === 'WAIT_ASSIGN')
  )
}

// 已派工：派工完成、尚未下发
function isAssigned(row: ProductionOrder) {
  return row.approvalStatus === 'APPROVED' && row.operationStatus === 'ASSIGNED'
}

export function getProductionOrderActions(row: ProductionOrder): ProductionOrderAction[] {
  const actions: ProductionOrderActionKey[] = ['view']

  if (isFirstStep(row)) {
    actions.push(...firstStepActions)
  } else if (isAssignmentStep(row)) {
    // 派工阶段：只显示设备/员工派工，派工完成后自动隐藏
    actions.push(...assignmentActions)
  } else if (isAssigned(row)) {
    // 派工完成后按 MRP 进度单一切换：未完成显示 MRP，配套出库确认后显示进入下发中心
    actions.push(row.mrpStatus === 'COMPLETED' ? 'dispatch' : 'materialPlan')
  }
  // DISPATCHED：流程已完成，不显示流程按钮

  actions.push('delete')
  return actions.map((key) => ({ key }))
}
