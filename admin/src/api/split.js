/**
 * 分账相关 API
 */
import { get, post } from './request.js'

/**
 * 申请分账
 */
export const applySplit = (data) => {
  return post('/api/split/apply', data)
}

/**
 * 获取分账记录
 */
export const getSplitRecords = (params) => {
  return get('/api/split/records', params)
}
