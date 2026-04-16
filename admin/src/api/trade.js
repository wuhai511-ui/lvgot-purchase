/**
 * 交易订单相关 API
 * 多账户模式：订单与账户编号关联
 */
import { get, post } from './request.js'

/**
 * 获取订单列表
 * @param {object} params - { merchant_id?, account_no?, status?, limit?, offset? }
 */
export const getOrders = (params = {}) => {
  return get('/api/orders', params)
}

/**
 * 获取订单详情
 * @param {number|string} orderId
 */
export const getOrderDetail = (orderId) => {
  return get(`/api/orders/${orderId}`)
}

/**
 * 发起手动分账
 * @param {number|string} orderId
 * @param {array} payeeList - [{account_no, amount}]
 */
export const splitOrder = (orderId, payeeList) => {
  return post(`/api/orders/${orderId}/splits`, { payee_list: payeeList })
}

/**
 * 批量创建订单
 * @param {array} orders - [{out_order_no, account_no, payee_account_no, amount}]
 */
export const batchCreateOrders = (orders) => {
  return post('/api/orders/batch', { orders })
}
