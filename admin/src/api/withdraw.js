/**
 * 提现相关 API
 */
import { get, post } from './request.js'

/**
 * 申请提现
 */
export const applyWithdraw = (data) => {
  return post('/api/withdraw/apply', data)
}

/**
 * 获取提现记录
 */
export const getWithdrawRecords = (params) => {
  return get('/api/withdraw/records', params)
}
