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
const assignedActions: ProductionOrderActionKey[] = [
  'materialPlan',
  'equipmentDispatch',
  'employeeDispatch',
]

function isFirstStep(row: ProductionOrder) {
  return (
    row.approvalStatus !== 'APPROVING' &&
    row.approvalStatus !== 'APPROVED' &&
    row.status !== 'WORK_ORDER_CREATED' &&
    row.status !== 'CANCELLED'
  )
}

function isAssignmentStep(row: ProductionOrder) {
  return (
    row.approvalStatus === 'APPROVED' &&
    (row.operationStatus === 'WAIT_CALC' || row.operationStatus === 'WAIT_ASSIGN')
  )
}

function isAssignedOrLater(row: ProductionOrder) {
  return (
    row.approvalStatus === 'APPROVED' &&
    (row.operationStatus === 'ASSIGNED' || row.operationStatus === 'DISPATCHED')
  )
}

export function getProductionOrderActions(row: ProductionOrder): ProductionOrderAction[] {
  const actions: ProductionOrderActionKey[] = ['view']

  if (isFirstStep(row)) {
    actions.push(...firstStepActions)
  } else if (isAssignmentStep(row)) {
    actions.push(...assignmentActions)
  } else if (isAssignedOrLater(row)) {
    actions.push(...assignedActions)
    if (row.operationStatus !== 'DISPATCHED') {
      actions.push('dispatch')
    }
  }

  actions.push('delete')
  return actions.map((key) => ({ key }))
}
