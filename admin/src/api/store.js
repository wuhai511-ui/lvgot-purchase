/**
 * 门店及商终管理 API
 */
import { get, post, del } from './request.js'

// ====== 原有商终管理 ======

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

// ====== 门店管理 ======

/**
 * 获取门店列表
 * GET /api/store?store_id=xxx&store_name=xxx&page=1&page_size=20
 */
export const getStoreList = (params) => {
  return get('/api/store', {
    store_id: params.store_id,
    store_name: params.store_name,
    page: params.page || 1,
    page_size: params.pageSize || 20
  })
}

/**
 * 获取门店详情
 * GET /api/store/:id
 */
export const getStoreDetail = (id) => {
  return get(`/api/store/${id}`)
}

/**
 * 新增门店
 * POST /api/store
 */
export const createStore = (data) => {
  return post('/api/store', {
    store_name: data.store_name,
    account_no: data.account_no,
    merchant_id: data.merchant_id
  })
}

/**
 * 删除门店
 * DELETE /api/store/:id
 */
export const deleteStore = (id) => {
  return del(`/api/store/${id}`)
}

/**
 * 获取可用账户列表（用于门店创建时选择）
 * GET /api/store/available/accounts
 */
export const getAvailableAccounts = () => {
  return get('/api/store/available/accounts')
}

/**
 * 新增终端（门店详情页）
 * POST /api/store/:storeId/terminals
 */
export const addTerminal = (storeId, data) => {
  return post(`/api/store/${storeId}/terminals`, {
    merchant_no: data.merchant_no,
    terminal_no: data.terminal_no,
    merchant_name: data.merchant_name
  })
}

/**
 * 删除终端
 * DELETE /api/store/terminals/:terminalId
 */
export const deleteTerminal = (terminalId) => {
  return del(`/api/store/terminals/${terminalId}`)
}
