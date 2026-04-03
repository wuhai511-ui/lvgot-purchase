/**
 * 账户相关 API
 */
import { get, post } from './request.js'

/**
 * 查询账户余额
 */
export const getAccountBalance = (merchantId) => {
  return get('/api/account/balance', { merchant_id: merchantId })
}

/**
 * 绑定商户号
 */
export const bindMerchant = (merchantId, merchantNo) => {
  return post('/api/account/bind-merchant', { merchant_id: merchantId, merchant_no: merchantNo })
}
