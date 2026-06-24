import type { WorkflowTask } from '@/types/domain'
import type { Tone } from '@/lib/orderStatus'

export type ApprovalCenterStatus = 'todo' | 'done' | 'rejected' | 'revoked'

export interface ApprovalCenterAction {
  key: 'view' | 'approve' | 'reject'
  title: string
}

const statusMeta: Record<ApprovalCenterStatus, { label: string; tone: Tone }> = {
  todo: { label: '待我审批', tone: 'warning' },
  done: { label: '已审批', tone: 'success' },
  rejected: { label: '已驳回', tone: 'danger' },
  revoked: { label: '已撤回', tone: 'muted' },
}

const businessTypeLabels: Record<string, string> = {
  ORDER_APPROVAL: '生产工单审批',
}

export function getApprovalCenterStatusLabel(status?: string) {
  return statusMeta[(status || '') as ApprovalCenterStatus]?.label || status || '-'
}

export function getApprovalCenterStatusTone(status?: string): Tone {
  return statusMeta[(status || '') as ApprovalCenterStatus]?.tone || 'muted'
}

export function getApprovalCenterBusinessTypeLabel(type?: string) {
  return businessTypeLabels[type || ''] || type || '-'
}

export function getApprovalCenterActions(row: Pick<WorkflowTask, 'status'>): ApprovalCenterAction[] {
  if (row.status === 'todo') {
    return [
      { key: 'view', title: '查看详情' },
      { key: 'approve', title: '审批通过' },
      { key: 'reject', title: '驳回' },
    ]
  }
  return [{ key: 'view', title: '查看详情' }]
}
