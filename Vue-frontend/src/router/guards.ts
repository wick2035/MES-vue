import type { Router } from 'vue-router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

NProgress.configure({ showSpinner: false })

const APP_TITLE = import.meta.env.VITE_APP_TITLE || 'MES'

/**
 * 注册全局守卫。M0 仅处理进度条与标题；
 * 登录拦截与角色校验在 M1 接入（见 setupAuthGuard）。
 */
export function setupRouterGuards(router: Router) {
  router.beforeEach(() => {
    NProgress.start()
    return true
  })

  router.afterEach((to) => {
    NProgress.done()
    document.title = to.meta.title ? `${to.meta.title} · ${APP_TITLE}` : APP_TITLE
  })
}
