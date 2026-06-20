import { http } from '@/api/request'
import type { WarehouseTwinData } from '@/types/domain'

/** 数字孪生库房数据（各库房网格规格 + 逐库位占用/库存，来自真实业务表） */
export function getWarehouseTwinData() {
  return http.post<WarehouseTwinData>('/digitization/dashboard/warehouse-twin')
}
