/**
 * 提现相关 API（多账户模式 + 两阶段SMS确认）
 */
import { get, post } from './request.js'

/**
 * 申请提现（第一阶段：发起提现，触发短信）
 * POST /api/withdraw/apply
 */
export const applyWithdraw = (data) => {
  return post('/api/withdraw/apply', {
    merchant_id: data.merchant_id,
    amount: data.amount,
    bank_card_no: data.bank_card_no,
    remark: data.remark || ''
  })
}

/**
 * 确认提现（第二阶段：提交短信验证码）
 * POST /api/withdraw/confirm
 */
export const confirmWithdraw = (data) => {
  return post('/api/withdraw/confirm', {
    out_request_no: data.out_request_no,
    account_no: data.account_no,
    withdraw_seq_no: data.withdraw_seq_no,
    sms_code: data.sms_code
  })
}

/**
 * 获取提现记录
 * GET /api/withdraw/records?merchant_id=xxx&page=1&pageSize=20
 */
export const getWithdrawRecords = (params) => {
  return get('/api/withdraw/records', {
    merchant_id: params.merchant_id,
    page: params.page || 1,
    pageSize: params.pageSize || 20
  })
}
