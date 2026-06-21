import { http } from '@/api/request'
import type { IPage } from '@/types/api'
import type { WorkflowTask } from '@/types/domain'

const BASE = '/workflow/task'

export interface WorkflowTaskSummary {
  total?: number
  todo?: number
  done?: number
  rejected?: number
  revoked?: number
  overdue?: number
}

export function pageWorkflowTasks(params: Record<string, any>) {
  return http.post<IPage<WorkflowTask>>(`${BASE}/page`, params)
}

export function getWorkflowTaskSummary(params: Record<string, any>) {
  return http.get<WorkflowTaskSummary>(`${BASE}/summary`, params)
}

export function completeWorkflowTask(taskId: string, opinion?: string) {
  return http.postJson(`${BASE}/complete`, { taskId, opinion })
}

export function rejectWorkflowTask(taskId: string, opinion?: string) {
  return http.postJson(`${BASE}/reject`, { taskId, opinion })
}
