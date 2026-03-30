import { getToken, getMerchantInfo } from '@/utils/storage'

/**
 * 路由守卫列表
 * 目前只有 beforeEach，后续可扩展
 */
export default [
  {
    // 每次路由跳转前检查登录状态
    beforeEach(to, from, next) {
      // /login 始终放行
      if (to.path === '/login') {
        next()
        return
      }

      // 检查 token
      const token = getToken()
      if (!token) {
        next('/login')
        return
      }

      // 解析商户信息，存入 route meta
      const merchantInfo = getMerchantInfo()
      if (merchantInfo) {
        to.meta.merchantInfo = merchantInfo
      }

      next()
    },
  },
]
