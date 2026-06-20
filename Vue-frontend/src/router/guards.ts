import type { Router } from 'vue-router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { useUserStore } from '@/stores/user'
import { registerUnauthorizedHandler } from '@/api/request'

NProgress.configure({ showSpinner: false })

const APP_TITLE = import.meta.env.VITE_APP_TITLE || 'MES'

/**
 * 全局守卫：
 *  - 进度条与标题；
 *  - 登录拦截：未登录访问受保护路由 → /login（带 redirect 回跳）；
 *  - 角色校验：meta.roles 限定时校验用户角色，不足 → /403；
 *  - 已登录再访问 /login → 跳首页；
 *  - 接口 401（会话失效）→ 清登录态并回登录页。
 */
export function setupRouterGuards(router: Router) {
  // 接口 401 统一处理（由 axios 拦截器回调）
  registerUnauthorizedHandler(() => {
    const userStore = useUserStore()
    userStore.reset()
    const current = router.currentRoute.value
    if (current.name !== 'Login') {
      router.replace({ name: 'Login', query: { redirect: current.fullPath } })
    }
  })

  router.beforeEach((to) => {
    NProgress.start()
    const userStore = useUserStore()

    if (to.meta.public) {
      if (to.name === 'Login' && userStore.isLoggedIn) return { path: '/' }
      return true
    }

    if (!userStore.isLoggedIn) {
      return { name: 'Login', query: { redirect: to.fullPath } }
    }

    if (!userStore.hasAnyRole(to.meta.roles)) {
      return { path: '/403' }
    }

    return true
  })

  router.afterEach((to) => {
    NProgress.done()
    document.title = to.meta.title ? `${to.meta.title} · ${APP_TITLE}` : APP_TITLE
  })
}
