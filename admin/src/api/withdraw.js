/**
 * 提现相关 API
 * 多账户模式：apply 需要 account_no（由前端已选账户决定）
 */
import { get, post } from './request.js'

/**
 * 申请提现
 * @param {object} data - { account_no, amount, bank_card_no, remark }
 */
export const applyWithdraw = (data) => {
  return post('/api/withdraw/apply', data)
}

/**
 * 发送提现短信验证码
 * @param {string} outRequestNo
 */
export const sendWithdrawSms = (outRequestNo) => {
  return post('/api/withdraw/send-sms', { out_request_no: outRequestNo })
}

/**
 * 确认提现
 * @param {object} data - { out_request_no, sms_code }
 */
export const confirmWithdraw = (data) => {
  return post('/api/withdraw/confirm', data)
}

/**
 * 获取提现记录
 * @param {object} params - { merchant_id?, account_no?, limit?, offset? }
 */
export const getWithdrawRecords = (params = {}) => {
  return get('/api/withdraw/records', params)
}
