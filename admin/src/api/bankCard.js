/**
 * 银行卡相关 API
 */
import { get, post, del } from './request.js'

/**
 * 获取银行卡列表
 */
export const getBankCards = (merchantId) => {
  return get('/api/bank-cards', { merchant_id: merchantId })
}

/**
 * 绑定银行卡
 */
export const bindBankCard = (data) => {
  return post('/api/bank-cards/bind', data)
}

/**
 * 解绑银行卡
 */
export const unbindBankCard = (id) => {
  return del(`/api/bank-cards/${id}`)
}
