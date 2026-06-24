import { http } from '@/api/request'
import type { IPage } from '@/types/api'
import type { Team } from '@/types/domain'

const BASE = '/basedata/team'

export function pageTeams(params: Record<string, any>) {
  return http.post<IPage<Team>>(`${BASE}/page`, params)
}
/** 全部班组（下拉数据源，仅正常状态） */
export function listTeams() {
  return http.get<Team[]>(`${BASE}/list`)
}
export function saveTeam(data: Team) {
  return http.post(`${BASE}/add-or-update`, data as Record<string, any>)
}
export function deleteTeam(id: string) {
  return http.post(`${BASE}/delete`, { id })
}
