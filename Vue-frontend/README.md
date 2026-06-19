# MES 工业互联网 Vue 3 前端

智能制造执行系统（MES）的 Vue 3 单页前端，对接同仓库 Spring Boot 后端（`:9090`）。

## 技术栈

- 构建：Vite 5 + Vue 3 + TypeScript
- 路由 / 状态：vue-router 4、Pinia（pinia-plugin-persistedstate 持久化）
- UI：shadcn-vue（reka-ui）+ Tailwind CSS，图标 lucide-vue-next
- 表单校验：vee-validate + zod
- 可视化：ECharts（vue-echarts）、Three.js（@tresjs/core）
- 其它：axios、@vueuse/core、vue-sonner、nprogress、dayjs

## 开发

```bash
npm install
npm run dev      # http://localhost:5173 ，/api 代理到 :9090 后端
```

> 需先按仓库根 README 启动后端（`:9090`，MySQL 已初始化）。开发态所有接口经 Vite 代理 `/api` 透传，浏览器视角同源，Shiro 会话 Cookie 自然生效，无需 CORS。

## 构建

```bash
npm run build    # 类型检查 + 生产构建到 dist/
npm run preview  # 本地预览构建产物
```

## 目录

```
src/
  api/         接口层（axios 实例 + 各业务域模块）
  assets/      样式与设计令牌（亮色工业风 + 暗色大屏）
  components/  ui(shadcn) / common(通用业务封装) / layout / charts
  composables/ 组合式逻辑复用
  router/      路由表 + 守卫
  stores/      Pinia 状态（user / app / notification）
  types/       类型定义
  views/       业务页面
```
