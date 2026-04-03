/**
 * 充值相关 API
 */
import { get, post } from './request.js'

/**
 * 申请充值
 */
export const applyRecharge = (data) => {
  return post('/api/recharge/apply', data)
}

/**
 * 获取充值记录
 */
export const getRechargeRecords = (params) => {
  return get('/api/recharge/records', params)
}
