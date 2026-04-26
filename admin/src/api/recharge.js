/**
 * 充值相关 API（多账户模式）
 */
import { get, post } from './request.js'

/**
 * 申请充值（预下单）
 * POST /api/recharge/apply
 */
export const applyRecharge = (data) => {
  return post('/api/recharge/apply', {
    merchant_id: data.merchant_id,
    amount: data.amount,
    remark: data.remark || ''
  })
}

/**
 * 获取充值记录
 * GET /api/recharge/records?merchant_id=xxx&page=1&pageSize=20
 */
export const getRechargeRecords = (params) => {
  return get('/api/recharge/records', {
    merchant_id: params.merchant_id,
    page: params.page || 1,
    pageSize: params.pageSize || 20
  })
}
