/**
 * 基础路由配置
 * 页面组件将在后续任务中填充
 */
const routes = [
  {
    path: '/login',
    name: 'Login',
    // 组件在后续任务中创建
    component: () => import('../pages/Login.vue'),
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../pages/Dashboard.vue'),
  },
  {
    // 未匹配路由重定向到 /
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

export default routes
