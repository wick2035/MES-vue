/** 后端统一返回结构（com.wangziyang.mes.common.Result） */
export interface Result<T = unknown> {
  /** 0 成功 / 1 失败 */
  code: number
  data: T
  msg: string
}

/** MyBatis-Plus 分页结构（IPage） */
export interface IPage<T = unknown> {
  records: T[]
  total: number
  current: number
  size: number
  pages: number
}

/** 分页请求基类（com.wangziyang.mes.common.BasePageReq） */
export interface PageReq {
  current?: number
  size?: number
  orderBy?: string
  [key: string]: unknown
}
