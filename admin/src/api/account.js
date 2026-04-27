/**
 * 账户相关 API（多账户模式）
 */
import { get, post } from './request.js'

/**
 * 按商户ID查询账户余额
 * GET /api/account/balance?merchant_id=xxx
 */
export const getAccountBalance = (merchantId) => {
  return get('/api/account/balance', { merchant_id: merchantId })
}

/**
 * 按账户编号查询余额
 * GET /api/account/balance?account_no=xxx
 */
export const getBalanceByAccountNo = (accountNo) => {
  return get('/api/account/balance', { account_no: accountNo })
}

/**
 * 获取账户列表（商户下所有账户）
 * 复用 balance 接口，其 data.accounts 返回账户列表
 */
export const getAccountList = (merchantId) => {
  return get('/api/account/balance', { merchant_id: merchantId })
}

/**
 * 绑定商户号
 */
export const bindMerchant = (merchantId, merchantNo) => {
  return post('/api/account/bind-merchant', { merchant_id: merchantId, merchant_no: merchantNo })
}

/**
 * 获取账户动账明细
 * GET /api/account/flow?account_no=xxx&page=1&page_size=20&start_date=&end_date=
 */
export const getAccountFlow = (params) => {
  return get('/api/account/flow', {
    account_no: params.account_no,
    page: params.page || 1,
    page_size: params.pageSize || 20,
    start_date: params.start_date || '',
    end_date: params.end_date || ''
  })
}
