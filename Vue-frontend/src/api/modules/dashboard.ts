import { http } from '@/api/request'
import type { DashboardData } from '@/types/domain'

/** 智能制造数据中心大屏聚合数据（全部来自真实业务表） */
export function getDashboardData() {
  return http.post<DashboardData>('/digitization/dashboard/data')
}
