/**
 * 账户相关 API
 * 多账户模式支持：所有接口均支持 merchant_id 过滤
 */
import { get, post } from './request.js'

/**
 * 获取商户的账户列表
 * @param {number|string} merchantId - 商户 ID
 */
export const getAccounts = (merchantId) => {
  return get('/api/accounts', { merchant_id: merchantId })
}

/**
 * 查询账户余额
 * @param {string} accountNo - 账户编号
 */
export const getAccountBalance = (accountNo) => {
  return get('/api/account/balance', { account_no: accountNo })
}

/**
 * 绑定商户号
 */
export const bindMerchant = (merchantId, merchantNo) => {
  return post('/api/account/bind-merchant', { merchant_id: merchantId, merchant_no: merchantNo })
}

/**
 * 获取账户可提现余额
 * @param {string} accountNo
 */
export const getWithdrawableBalance = (accountNo) => {
  return get('/api/account/withdrawable-balance', { account_no: accountNo })
}
