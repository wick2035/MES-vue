# MES 智造执行系统 · Vue 3 工业互联网前端

面向制造执行系统（MES）的现代化 Web 前端，基于 **Vue 3 + TypeScript + Vite + shadcn-vue**，
对接同仓库的 Spring Boot 后端真实接口，覆盖从基础数据、工艺工单到工序采集、数据看板的完整制造业务闭环，
并内置 AI 智能助手、实时通知、全局命令面板、数字孪生 3D 等特色能力。

> 设计目标：工业精密风 + 当代审美，深浅主题一键切换，交互流畅、零控制台报错。

---

## ✨ 功能总览

| 模块 | 说明 |
| --- | --- |
| 登录鉴权 | 验证码登录、Shiro 会话、路由守卫、RBAC 角色校验、状态持久化（刷新不丢） |
| 数据看板 | ECharts 多图联动（订单/工序/达成率/不良率/库存/人员），KPI 卡片，30s 自动刷新 |
| 基础数据 | 物料 / 设备 / 班组 / 库房 / 库存 增删改查（含 Excel 导入、唯一性校验） |
| 生产管理 | 生产订单中心、生产工单全生命周期（审批→下发→生产→完工→交付）、工单详情 `:id` |
| 工艺技术 | 产品 BOM（结构详情 `:id`）、工序定义、工艺路线 |
| 在制管理 | SN 工序采集、SN 追溯 `:sn`（OK/NG 过站轨迹） |
| 系统管理 | 用户 / 角色 / 菜单 / 部门 RBAC 管理（仅管理员可见） |
| 🤖 AI 智能助手 | SSE 流式对话 + 工具调用（查真实业务数据）+ 会话历史，Markdown 渲染 |
| 🔔 实时通知 | WebSocket 通知中心，产线动态 / 不良预警实时推送 + 未读角标 + toast |
| ⌘ 命令面板 | `Ctrl/⌘ + K` 全局检索菜单并快速跳转 |
| 🧊 数字孪生 | three.js 3D 产线看板，按真实工序良率着色 + 物料流动 + 告警脉冲 |
| 🌗 主题切换 | 亮色工业风 ↔ 暗色大屏风，令牌化配色，持久化 |

---

## 🛠 技术栈

- **核心**：Vue 3.4（`<script setup>`）· TypeScript · Vite 5
- **路由 / 状态**：Vue Router 4（嵌套路由 / 动态参数 / 守卫）· Pinia + `pinia-plugin-persistedstate`
- **UI**：shadcn-vue（基于 reka-ui）· Tailwind CSS · 图标统一 `lucide-vue-next`
- **表单校验**：vee-validate + zod
- **可视化 / 3D**：ECharts + vue-echarts（按需注册）· three.js（原生引擎封装）
- **数据**：axios（拦截器统一表单编码 / 会话 Cookie / Result 解包）· dayjs · markdown-it
- **工程化**：ESLint + Prettier · `unplugin-auto-import` · `unplugin-vue-components` · `@` 别名

---

## 🚀 快速开始

需先启动后端（详见仓库根 `CLAUDE.md` / `README`），默认运行于 `http://localhost:9090`：

```powershell
# 后端（仓库根目录，另开终端）
mvn -s .\.codex-maven-settings.xml -f .\mes\pom.xml -DskipTests spring-boot:run
```

前端：

```bash
cd Vue-frontend
npm install
npm run dev      # http://localhost:5173 ，/api 经 Vite 代理到 :9090（同源，会话 Cookie 透传）
```

默认账号 `admin / 123` + 验证码登录。

### 常用脚本

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动开发服务器（含 `/api` 代理与 WebSocket 代理） |
| `npm run build` | 类型检查（vue-tsc）+ 生产构建 |
| `npm run preview` | 预览生产构建 |
| `npm run lint` | ESLint 自动修复 |
| `npm run smoke` | Playwright 端到端冒烟（登录→遍历页面→采集控制台/页面错误） |

---

## 🗂 目录结构

```text
Vue-frontend/
├─ vite.config.ts          # /api 代理(含 ws)、按需引入、manualChunks 分包
├─ src/
│  ├─ api/                 # request.ts(axios 实例+拦截器) + modules/*(按域)
│  ├─ assets/styles/       # Tailwind + 设计令牌（亮/暗主题）
│  ├─ components/
│  │  ├─ ui/               # shadcn-vue 基础组件
│  │  ├─ common/           # 通用业务封装：SpDataTable / SpForm / SpChart / SpTree …
│  │  └─ layout/           # AppLayout/Sidebar/Header/Tabs/CommandPalette/NotificationBell
│  ├─ composables/         # useTable / useCommandPalette …
│  ├─ lib/                 # icons / toast / markdown / twin(3D 引擎)
│  ├─ router/              # routes.ts(嵌套路由树) + guards(登录/角色守卫)
│  ├─ stores/              # user / app / tabs / notify（Pinia 模块化，持久化）
│  ├─ types/               # domain.ts / api.ts 领域与契约类型
│  └─ views/               # 各业务模块页面（路由级懒加载）
└─ scripts/smoke.mjs       # 端到端冒烟脚本
```

---

## 🔌 与后端的对接要点

- **代理同源**：浏览器经 Vite 代理访问 `/api/**`，避免跨域，Shiro 会话 Cookie 自然透传。
- **请求约定**：`axios` 请求拦截器将 POST 体序列化为 `application/x-www-form-urlencoded`（后端实体绑定），
  响应按 `Result{code,data,msg}` 统一解包；`401` 触发登出跳转登录。
- **分页**：列表接口入参继承 `current/size/orderBy`，返回 `IPage{records,total}`，由 `SpDataTable` 统一消费。
- **实时**：WebSocket `/api/client/ws/notify`（经 ws 代理）；AI 助手 SSE `GET /api/llm/chat/stream`（EventSource）。

---

## ⚡ 性能优化

- 路由级 `() => import()` 懒加载；`<keep-alive>` 缓存多页签视图。
- `manualChunks` 将 **ECharts / three / 框架核心** 拆为独立缓存块，重型库仅在对应页面按需加载。
- ECharts 仅 `use([...])` 所需图表与组件；lucide 图标按需登记，避免全量打包。
- 骨架屏 / loading 态覆盖列表、看板、表单按钮，保证交互即时反馈。

---

## 🌿 分支与提交规范

`master`（稳定）← `develop`（集成）← `feature/*`（每里程碑一支）。
提交遵循 `feat: / fix: / docs: / chore: / perf: / refactor:` 约定式中文描述，小步提交。
