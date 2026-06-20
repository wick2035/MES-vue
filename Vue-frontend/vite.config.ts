import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'

// MES 前端构建配置：/api 代理到 9090 后端（含 WebSocket），按需自动引入
export default defineConfig({
  clearScreen: false,
  plugins: [
    vue(),
    // 自动引入 Vue / Router / Pinia / VueUse 的组合式 API，免去重复 import
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia', '@vueuse/core'],
      dts: 'src/types/auto-imports.d.ts',
      eslintrc: { enabled: true },
    }),
    // 自动注册 src/components 下的组件
    Components({
      dirs: ['src/components'],
      extensions: ['vue'],
      deep: true,
      dts: 'src/types/components.d.ts',
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
    proxy: {
      // 全部后端接口经此代理，浏览器视角同源，Shiro 会话 Cookie 自然透传
      '/api': {
        target: 'http://localhost:9090',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  preview: {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // 将重型第三方库拆分为独立缓存块：ECharts(看板) / three(数字孪生) / 核心框架，
        // 配合路由级懒加载，按需加载且利于浏览器长期缓存
        manualChunks: {
          echarts: ['echarts', 'vue-echarts'],
          three: ['three'],
          vendor: ['vue', 'vue-router', 'pinia', '@vueuse/core'],
        },
      },
    },
  },
})
