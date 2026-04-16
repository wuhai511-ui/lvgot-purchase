/**
 * 充值相关 API
 * 多账户模式：apply 需要 account_no（由前端已选账户决定）
 */
import { get, post } from './request.js'

/**
 * 申请充值
 * @param {object} data - { account_no, amount, remark }
 */
export const applyRecharge = (data) => {
  return post('/api/recharge/apply', data)
}

/**
 * 查询充值状态
 * @param {string} outRequestNo - 充值请求号
 */
export const queryRechargeStatus = (outRequestNo) => {
  return get('/api/recharge/status', { out_request_no: outRequestNo })
}

/**
 * 获取充值记录
 * @param {object} params - { merchant_id?, account_no?, limit?, offset? }
 */
export const getRechargeRecords = (params = {}) => {
  return get('/api/recharge/records', params)
}
