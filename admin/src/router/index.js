import { createRouter, createWebHashHistory } from 'vue-router'
import routes from './routes'

const router = createRouter({
  // Hash 模式，适配 GitHub Pages
  history: createWebHashHistory('/'),
  routes,
})

export default router
