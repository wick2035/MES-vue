import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'

/** 主框架布局（侧栏 + 头部 + 内容区） */

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
        path: 'assistant',
        name: 'Assistant',
        component: () => import('@/views/assistant/AssistantView.vue'),
        meta: { title: '智能助手', icon: 'Bot', keepAlive: true },
      },
      {
        path: 'twin',
        redirect: '/twin/line',
        meta: { title: '数字孪生', icon: 'Box' },
        children: [
          {
            path: 'line',
            name: 'DigitalTwinLine',
            component: () => import('@/views/twin/DigitalTwinView.vue'),
            meta: { title: '数字孪生产线', icon: 'Factory' },
          },
          {
            path: 'warehouse',
            name: 'DigitalTwinWarehouse',
            component: () => import('@/views/twin/WarehouseTwinView.vue'),
            meta: { title: '数字孪生库房', icon: 'Warehouse' },
          },
        ],
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/ProfileView.vue'),
        meta: { title: '个人中心', hidden: true },
      },
      {
        path: 'basedata',
        redirect: '/basedata/material',
        meta: { title: '基础数据', icon: 'Database' },
        children: [
          {
            path: 'material',
            name: 'Material',
            component: () => import('@/views/basedata/material/MaterialListView.vue'),
            meta: { title: '物料管理', icon: 'Package', keepAlive: true },
          },
          {
            path: 'equipment',
            name: 'Equipment',
            component: () => import('@/views/basedata/equipment/EquipmentListView.vue'),
            meta: { title: '设备管理', icon: 'Cpu', keepAlive: true },
          },
          {
            path: 'team',
            name: 'Team',
            component: () => import('@/views/basedata/team/TeamListView.vue'),
            meta: { title: '班组管理', icon: 'Users', keepAlive: true },
          },
          {
            path: 'warehouse',
            name: 'Warehouse',
            component: () => import('@/views/basedata/warehouse/WarehouseListView.vue'),
            meta: { title: '库房管理', icon: 'Warehouse', keepAlive: true },
          },
          {
            path: 'inventory',
            name: 'Inventory',
            component: () => import('@/views/basedata/inventory/InventoryListView.vue'),
            meta: { title: '库存管理', icon: 'Boxes', keepAlive: true },
          },
        ],
      },
      {
        path: 'production',
        redirect: '/production/order',
        meta: { title: '生产管理', icon: 'Factory' },
        children: [
          {
            path: 'plan',
            name: 'ProductionPlan',
            component: () => import('@/views/production/ProductionPlanView.vue'),
            meta: { title: '生产订单', icon: 'ClipboardList', keepAlive: true },
          },
          {
            path: 'order',
            name: 'Order',
            component: () => import('@/views/order/OrderListView.vue'),
            meta: { title: '生产工单', icon: 'Factory', keepAlive: true },
          },
          {
            path: 'approval',
            name: 'ApprovalCenter',
            component: () => import('@/views/approval/ApprovalCenterView.vue'),
            meta: { title: '审批中心', icon: 'ClipboardCheck', keepAlive: true },
          },
          {
            path: 'material-plan',
            name: 'MaterialPlan',
            component: () => import('@/views/production/MaterialPlanView.vue'),
            meta: { title: '物料需求计划', icon: 'Boxes', keepAlive: true },
          },
          {
            path: 'equipment-dispatch',
            name: 'EquipmentDispatch',
            component: () => import('@/views/production/EquipmentDispatchView.vue'),
            meta: { title: '设备作业派工', icon: 'Cpu', keepAlive: true },
          },
          {
            path: 'employee-dispatch',
            name: 'EmployeeDispatch',
            component: () => import('@/views/production/EmployeeDispatchView.vue'),
            meta: { title: '员工作业派工', icon: 'Users', keepAlive: true },
          },
          {
            path: 'dispatch',
            name: 'ProductionDispatch',
            component: () => import('@/views/production/ProductionDispatchView.vue'),
            meta: { title: '生产计划下发', icon: 'Send', keepAlive: true },
          },
          {
            path: 'change',
            name: 'WorkOrderChange',
            component: () => import('@/views/order/WorkOrderChangeView.vue'),
            meta: { title: '工单变更', icon: 'FileClock', keepAlive: true },
          },
          {
            path: 'order/:id',
            name: 'OrderDetail',
            component: () => import('@/views/order/OrderDetailView.vue'),
            meta: { title: '工单详情', hidden: true },
          },
        ],
      },
      {
        path: 'warehouse',
        redirect: '/warehouse/request',
        meta: { title: '仓储管理', icon: 'PackageOpen' },
        children: [
          {
            path: 'request',
            name: 'WarehouseRequest',
            component: () => import('@/views/warehouse/WarehouseRequestView.vue'),
            meta: { title: '出入库管理', icon: 'ArrowLeftRight', keepAlive: true },
          },
        ],
      },
      {
        path: 'technology',
        redirect: '/technology/bom',
        meta: { title: '工艺技术', icon: 'GitBranch' },
        children: [
          {
            path: 'bom',
            name: 'Bom',
            component: () => import('@/views/technology/bom/BomListView.vue'),
            meta: { title: '产品 BOM', icon: 'Boxes', keepAlive: true },
          },
          {
            path: 'bom/:id',
            name: 'BomDetail',
            component: () => import('@/views/technology/bom/BomDetailView.vue'),
            meta: { title: 'BOM 结构', hidden: true },
          },
          {
            path: 'oper',
            name: 'Oper',
            component: () => import('@/views/technology/oper/OperListView.vue'),
            meta: { title: '工序定义', icon: 'Cpu', keepAlive: true },
          },
          {
            path: 'flow',
            name: 'Flow',
            component: () => import('@/views/technology/flow/FlowListView.vue'),
            meta: { title: '工艺路线', icon: 'GitBranch', keepAlive: true },
          },
        ],
      },
      {
        path: 'wip',
        redirect: '/wip/records',
        meta: { title: '在制管理', icon: 'ScanLine' },
        children: [
          {
            path: 'records',
            name: 'SnRecords',
            component: () => import('@/views/wip/SnRecordsView.vue'),
            meta: { title: '工序采集', icon: 'ScanLine', keepAlive: true },
          },
          {
            path: 'trace/:sn',
            name: 'SnTrace',
            component: () => import('@/views/wip/SnTraceView.vue'),
            meta: { title: 'SN 追溯', hidden: true },
          },
        ],
      },
      {
        path: 'system',
        redirect: '/system/user',
        // 角色校验：仅管理员可见/可进入（路由守卫 + 侧栏过滤共同生效）
        meta: { title: '系统管理', icon: 'Settings', roles: ['admin', '888888'] },
        children: [
          {
            path: 'user',
            name: 'User',
            component: () => import('@/views/system/user/UserListView.vue'),
            meta: { title: '用户管理', icon: 'Users', roles: ['admin', '888888'], keepAlive: true },
          },
          {
            path: 'role',
            name: 'Role',
            component: () => import('@/views/system/role/RoleListView.vue'),
            meta: {
              title: '角色管理',
              icon: 'ShieldCheck',
              roles: ['admin', '888888'],
              keepAlive: true,
            },
          },
          {
            path: 'menu',
            name: 'MenuTree',
            component: () => import('@/views/system/menu/MenuTreeView.vue'),
            meta: {
              title: '菜单管理',
              icon: 'ListTree',
              roles: ['admin', '888888'],
              keepAlive: true,
            },
          },
          {
            path: 'dept',
            name: 'Dept',
            component: () => import('@/views/system/dept/DeptTreeView.vue'),
            meta: {
              title: '部门管理',
              icon: 'Building2',
              roles: ['admin', '888888'],
              keepAlive: true,
            },
          },
        ],
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
