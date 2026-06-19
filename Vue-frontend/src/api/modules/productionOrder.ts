import { http } from '@/api/request'
import type { IPage } from '@/types/api'
import type { ProductionOrder } from '@/types/domain'

const BASE = '/production-order/plan'

export function pageProductionOrders(params: Record<string, any>) {
  return http.post<IPage<ProductionOrder>>(`${BASE}/page`, params)
}
