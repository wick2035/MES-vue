import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router'
import { useAppStore } from './stores/app'
import './assets/styles/index.css'

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)

// 持久化恢复后立即应用主题（避免首屏闪烁）
useAppStore().applyTheme()

app.use(router)
app.mount('#app')
