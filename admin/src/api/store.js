/**
 * 门店及商终管理 API
 */
import { get, post } from './request.js'

/**
 * 获取商户下的门店列表
 * @param {number|string} merchantId
 */
export const getStores = (merchantId) => {
  return get('/api/stores', { merchant_id: merchantId })
}

/**
 * 创建门店
 * @param {object} data
 */
export const createStore = (data) => {
  return post('/api/stores', data)
}

/**
 * 更新门店
 * @param {number|string} id
 * @param {object} data
 */
export const updateStore = (id, data) => {
  return post(`/api/stores/${id}`, data)
}

/**
 * 删除门店
 * @param {number|string} id
 */
export const deleteStore = (id) => {
  return post(`/api/stores/${id}/delete`, {})
}

/**
 * 获取门店详情（含商终列表）
 * @param {number|string} id
 */
export const getStoreDetail = (id) => {
  return get(`/api/stores/${id}`)
}

/**
 * 获取商终列表
 * @param {number|string} storeId
 */
export const getTerminalsByStore = (storeId) => {
  return get('/api/terminals', { store_id: storeId })
}

/**
 * 绑定商终
 * @param {object} data - { store_id, merchant_no, terminal_no, account_no }
 */
export const bindTerminal = (data) => {
  return post('/api/terminals/bind', data)
}

/**
 * 解绑商终
 * @param {number|string} id - 商终 ID
 */
export const unbindTerminal = (id) => {
  return post(`/api/terminals/${id}/unbind`, {})
}
