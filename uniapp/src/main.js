import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import vant from './plugins/vant'

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(vant)

  return {
    app
  }
}
