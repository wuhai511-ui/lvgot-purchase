/**
 * 订单相关 API
 */
import { get, post } from './request.js'

/**
 * 获取支付订单列表
 * GET /api/orders/pay?order_no=xxx&store_id=xxx&pay_status=xxx&split_status=xxx&page=1&page_size=20
 */
export const getPayOrders = (params) => {
  return get('/api/orders/pay', {
    order_no: params.order_no,
    store_id: params.store_id,
    pay_status: params.pay_status,
    split_status: params.split_status,
    page: params.page || 1,
    page_size: params.pageSize || 20
  })
}

/**
 * 获取提现订单列表
 * GET /api/orders/withdraw?page=1&page_size=20
 */
export const getWithdrawOrders = (params) => {
  return get('/api/orders/withdraw', {
    status: params.status,
    page: params.page || 1,
    page_size: params.pageSize || 20
  })
}

/**
 * 获取订单详情
 * GET /api/orders/:orderNo
 */
export const getOrderDetail = (orderNo) => {
  return get(`/api/orders/${orderNo}`)
}

/**
 * 手动触发分账
 * POST /api/orders/:orderNo/split
 */
export const triggerSplit = (orderNo) => {
  return post(`/api/orders/${orderNo}/split`, {})
}
