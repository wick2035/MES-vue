import type { RouteRecordRaw } from 'vue-router'

/** 主框架布局（侧栏 + 头部 + 内容区） */
const AppLayout = () => import('@/components/layout/AppLayout.vue')

/**
 * 业务路由树。多级嵌套：AppLayout → 模块组 → 页面；动态参数见各模块 :id/:sn。
 * meta.roles 控制角色可见性；后续里程碑在此持续追加模块。
 */
export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/LoginView.vue'),
    meta: { title: '登录', hidden: true, public: true },
  },
  {
    path: '/',
    component: AppLayout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/DashboardView.vue'),
        meta: { title: '数据看板', icon: 'LayoutDashboard', keepAlive: true },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/ProfileView.vue'),
        meta: { title: '个人中心', hidden: true },
      },
    ],
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/error/ForbiddenView.vue'),
    meta: { title: '无权访问', hidden: true, public: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/NotFoundView.vue'),
    meta: { title: '页面不存在', hidden: true, public: true },
  },
]
