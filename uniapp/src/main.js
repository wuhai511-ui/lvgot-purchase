import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import vant from './plugins/vant'
import { router } from './router/index.js'
import '@/utils/uni.js'

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(vant)
  app.use(router)

  return { app }
}
