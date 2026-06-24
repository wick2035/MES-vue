/** 表格列定义 */
export interface TableColumn {
  key: string
  title: string
  width?: string
  align?: 'left' | 'center' | 'right'
  /** 指定后用同名插槽渲染单元格 */
  slot?: string
  /** 指定后用同名插槽渲染表头（无则渲染 title） */
  headSlot?: string
  /** 文本格式化（无插槽时） */
  formatter?: (row: any, value: any) => string
}

/** 表单字段定义（schema 驱动的通用表单） */
export interface FormField {
  field: string
  label: string
  type: 'input' | 'textarea' | 'number' | 'select' | 'password'
  placeholder?: string
  options?: { label: string; value: string | number }[]
  required?: boolean
  pattern?: RegExp
  patternMsg?: string
  min?: number
  max?: number
  readonly?: boolean
  /** 跨列：1 半行 / 2 整行 */
  span?: 1 | 2
}
