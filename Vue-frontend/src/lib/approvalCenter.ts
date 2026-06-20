import type { Order } from '@/types/domain'

export type ApprovalCenterStatus = 'todo' | 'approved'

export interface ApprovalCenterAction {
  key: 'view' | 'approve' | 'reject'
  title: string
}

export function getApprovalCenterStatue(status: ApprovalCenterStatus) {
  return status === 'approved' ? 2 : 1
}

export function getApprovalCenterActions(row: Pick<Order, 'statue'>): ApprovalCenterAction[] {
  if (row.statue === 1) {
    return [
      { key: 'view', title: '查看详情' },
      { key: 'approve', title: '审批通过' },
      { key: 'reject', title: '驳回' },
    ]
  }
  return [{ key: 'view', title: '查看详情' }]
}
