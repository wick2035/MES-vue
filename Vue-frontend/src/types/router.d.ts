import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** 页面标题（用于 document.title、面包屑、菜单名） */
    title?: string
    /** 可访问该路由的角色编码；缺省表示登录即可访问 */
    roles?: string[]
    /** lucide 图标名，用于侧栏菜单 */
    icon?: string
    /** 是否在侧栏隐藏 */
    hidden?: boolean
    /** 是否 keep-alive 缓存 */
    keepAlive?: boolean
    /** 是否无需登录即可访问 */
    public?: boolean
  }
}
