/**
 * 交易订单相关 API
 */
const BASE_URL = 'http://localhost:3001'

function request({ url, method = 'GET', data }) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + url,
      method,
      data,
      header: { 'Content-Type': 'application/json' },
      success: (res) => resolve(res.data),
      fail: (err) => reject(err),
    })
  })
}

/**
 * 获取订单列表
 * @param {object} params - { merchant_id?, account_no?, status?, limit?, offset? }
 */
export const getOrders = (params = {}) => {
  return request({ url: '/api/orders', data: params })
}

/**
 * 获取订单详情
 * @param {number|string} orderId
 */
export const getOrderDetail = (orderId) => {
  return request({ url: `/api/orders/${orderId}` })
}

/**
 * 发起分账
 * @param {number|string} orderId
 * @param {array} payeeList - [{account_no, amount}]
 */
export const splitOrder = (orderId, payeeList) => {
  return request({ url: `/api/orders/${orderId}/splits`, method: 'POST', data: { payee_list: payeeList } })
}

/**
 * 批量创建订单
 * @param {array} orders - [{out_order_no, account_no, payee_account_no, amount}]
 */
export const batchCreateOrders = (orders) => {
  return request({ url: '/api/orders/batch', method: 'POST', data: { orders } })
}
