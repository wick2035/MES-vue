import { http } from '@/api/request'
import type { IPage } from '@/types/api'
import type { Equipment } from '@/types/domain'

const BASE = '/basedata/equipment'

export function pageEquipments(params: Record<string, any>) {
  return http.post<IPage<Equipment>>(`${BASE}/page`, params)
}
export function saveEquipment(data: Equipment) {
  return http.post(`${BASE}/add-or-update`, data as Record<string, any>)
}
export function deleteEquipment(id: string) {
  return http.post(`${BASE}/delete`, { id })
}
