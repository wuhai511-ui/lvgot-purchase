/**
 * 交易订单 API（多账户模式）
 */
import { get, post } from './request.js'

/**
 * 获取交易订单列表
 * GET /api/orders
 */
export const getTradeOrders = (params) => {
  return get('/api/orders', {
    page: params.page || 1,
    page_size: params.pageSize || 20
  })
}

/**
 * 获取指定商户的交易流水
 * GET /api/merchant/:id/flow
 */
export const getMerchantFlow = (merchantId, params) => {
  return get(`/api/merchant/${merchantId}/flow`, params)
}
