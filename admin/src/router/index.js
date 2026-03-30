import { createRouter, createWebHashHistory } from 'vue-router'
import routes from './routes'
import guards from './guards'

const router = createRouter({
  // Hash 模式，适配 GitHub Pages
  history: createWebHashHistory('/'),
  routes,
})

// 注册路由守卫
guards.forEach(({ beforeEach }) => beforeEach && router.beforeEach(beforeEach))

export default router
