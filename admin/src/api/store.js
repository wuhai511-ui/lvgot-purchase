/**
 * 门店及商终管理 API
 */
import { get, post } from './request.js'

/**
 * 查询商终列表
 * GET /api/merchant/terminals?account_no=xxx&page=1&page_size=10
 */
export const getTerminals = (params) => {
  return get('/api/merchant/terminals', {
    account_no: params.account_no,
    page: params.page || 1,
    page_size: params.page_size || 10
  })
}

/**
 * 绑定商终
 * POST /api/merchant/terminals/bind
 */
export const bindTerminal = (data) => {
  return post('/api/merchant/terminals/bind', {
    account_no: data.account_no,
    merchant_no: data.merchant_no,
    merchant_name: data.merchant_name
  })
}

/**
 * 解绑商终
 * POST /api/merchant/terminals/unbind
 */
export const unbindTerminal = (data) => {
  return post('/api/merchant/terminals/unbind', {
    account_no: data.account_no,
    merchant_no: data.merchant_no
  })
}
