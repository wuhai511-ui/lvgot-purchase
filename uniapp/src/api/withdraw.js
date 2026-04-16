/**
 * 提现相关 API — 多账户模式
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
 * 申请提现（发送短信）
 * @param {object} data - { account_no, amount, bank_card_no, remark }
 */
export const applyWithdraw = (data) => {
  return request({ url: '/api/withdraw/apply', method: 'POST', data })
}

/**
 * 发送提现短信验证码
 * @param {string} outRequestNo
 */
export const sendWithdrawSms = (outRequestNo) => {
  return request({ url: '/api/withdraw/send-sms', method: 'POST', data: { out_request_no: outRequestNo } })
}

/**
 * 确认提现
 * @param {object} data - { out_request_no, sms_code }
 */
export const confirmWithdraw = (data) => {
  return request({ url: '/api/withdraw/confirm', method: 'POST', data })
}

/**
 * 获取提现记录
 * @param {object} params - { merchant_id?, account_no? }
 */
export const getWithdrawRecords = (params = {}) => {
  return request({ url: '/api/withdraw/records', data: params })
}
