import type { Tone } from '@/lib/orderStatus'

export interface WorkOrderChangeStatusMeta {
  label: string
  tone: Tone
}

const statusMap: Record<string, WorkOrderChangeStatusMeta> = {
  APPROVING: { label: '审批中', tone: 'warning' },
  APPLIED: { label: '已生效', tone: 'success' },
  REJECTED: { label: '已驳回', tone: 'danger' },
  APPROVED: { label: '已批准', tone: 'success' },
}

export function getWorkOrderChangeStatusMeta(status?: string): WorkOrderChangeStatusMeta {
  return statusMap[status || ''] || { label: status || '-', tone: 'muted' }
}
