/**
 * 账户相关 API — 多账户模式
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
 * 获取商户账户列表
 * @param {number} merchantId
 */
export const getAccounts = (merchantId) => {
  return request({ url: '/api/accounts', data: { merchant_id: merchantId } })
}

/**
 * 查询账户余额
 * @param {string} accountNo
 */
export const getAccountBalance = (accountNo) => {
  return request({ url: '/api/account/balance', data: { account_no: accountNo } })
}
