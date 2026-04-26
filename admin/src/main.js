import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { ElMessage } from 'element-plus'
import './styles/global.scss'
import MerchantApp from './views/App.vue'
import router from './router'

const app = createApp(MerchantApp)
app.use(ElementPlus)
app.use(router)
app.config.globalProperties.$message = ElMessage
app.mount('#app')
