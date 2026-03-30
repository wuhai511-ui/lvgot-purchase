/**
 * 基础路由配置
 */
import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
  },
  {
    path: '/',
    name: 'Dashboard',
    meta: { requiresAuth: true },
    component: Dashboard,
  },
  {
    // 未匹配路由重定向到 /
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

export default routes
