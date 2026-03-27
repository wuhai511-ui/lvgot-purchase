import { createApp as createVueApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import vant from './plugins/vant'
import 'vant/lib/index.css'   // Added vant CSS to fix styling
import { router } from './router/index.js'
import '@/utils/uni.js'

const app = createVueApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(vant)
app.use(router)

app.mount('#app')

