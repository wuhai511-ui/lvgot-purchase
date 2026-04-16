/**
 * 充值相关 API — 多账户模式
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
 * 申请充值
 * @param {object} data - { account_no, amount, remark }
 */
export const applyRecharge = (data) => {
  return request({ url: '/api/recharge/apply', method: 'POST', data })
}

/**
 * 查询充值状态
 * @param {string} outRequestNo
 */
export const queryRechargeStatus = (outRequestNo) => {
  return request({ url: '/api/recharge/status', data: { out_request_no: outRequestNo } })
}

/**
 * 获取充值记录
 * @param {object} params - { merchant_id?, account_no? }
 */
export const getRechargeRecords = (params = {}) => {
  return request({ url: '/api/recharge/records', data: params })
}
