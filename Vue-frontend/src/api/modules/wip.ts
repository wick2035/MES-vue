import { http } from '@/api/request'
import type { IPage } from '@/types/api'
import type { SnRecord, Order, SnRouteStep } from '@/types/domain'

/** SN 工序采集记录分页 */
export function pageSnRecords(params: Record<string, any>) {
  return http.post<IPage<SnRecord>>('/wip/sn-process/records', params)
}

/** 可采集的工单列表（带工艺路线、未终结） */
export function listScanOrders() {
  return http.get<Order[]>('/wip/sn-process/orders')
}

/** 某工单 + SN 的工艺路线执行状态 */
export function getSnRoute(orderId: string, sn: string) {
  return http.get<SnRouteStep[]>('/wip/sn-process/route', { orderId, sn })
}

/** 工序扫描采集（OK/NG），operId 为空时由后端自动取下一道待采集工序 */
export function scanSn(data: {
  orderId: string
  sn: string
  status: string
  operId?: string
  remark?: string
}) {
  return http.post<{
    record: SnRecord
    complete: boolean
    nextOper?: SnRouteStep
    route: SnRouteStep[]
  }>('/wip/sn-process/scan', data)
}
