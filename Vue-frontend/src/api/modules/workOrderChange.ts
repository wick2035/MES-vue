import { http } from '@/api/request'
import type { IPage } from '@/types/api'
import type { WorkOrderChange } from '@/types/domain'

const BASE = '/production-order/work-order-change'

export function pageWorkOrderChanges(params: Record<string, any>) {
  return http.post<IPage<WorkOrderChange>>(`${BASE}/page`, params)
}
