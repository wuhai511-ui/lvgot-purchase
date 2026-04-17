/**
 * 账户相关 API
 */
import { get, post } from './request.js'

/**
 * 查询账户余额
 */
export const getAccountBalance = (merchantId) => {
  return get('/api/v1/account/balance', { merchant_id: merchantId })
}

/**
 * 绑定商户号
 */
export const bindMerchant = (merchantId, merchantNo) => {
  return post('/api/v1/accounts/bind-merchant', { merchant_id: merchantId, merchant_no: merchantNo })
}
