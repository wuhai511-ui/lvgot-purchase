/**
 * 基础路由配置
 * 页面组件将在后续任务中填充
 */
const routes = [
  {
    path: '/login',
    name: 'Login',
    // TODO: 替换为 import('../pages/Login.vue')
    component: { template: '<div></div>' },
  },
  {
    path: '/',
    name: 'Dashboard',
    // TODO: 替换为 import('../pages/Dashboard.vue')
    component: { template: '<div></div>' },
  },
  {
    // 未匹配路由重定向到 /
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

export default routes
