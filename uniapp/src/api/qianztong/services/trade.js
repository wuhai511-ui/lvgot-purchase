/**
 * 钱账通·交易服务
 * 文档：Chapter 7.3 / 7.8 / 8.4 / 8.6
 * 通知：TRADE_NOTIFY / TRADE_FEE_NOTIFY
 */
import request from '@/utils/request.js'

/**
 * 交易分账
 * @param {object} params
 * @param {string} params.out_request_no - 外部请求编号
 * @param {string} params.merchant_id - 商户ID
 * @param {string} params.trade_no - 交易单号
 * @param {Array<{split_id: string, amount: string, remark?: string}>} params.split_list - 分账明细
 * @returns {Promise<{out_request_no, split_status}>}
 */
export async function split(params) {
  return request.post('/api/qzt/proxy', { service: 'trade.balance.split', params })
}

/**
 * 分账结果查询
 * @param {object} params - 三选一
 * @param {string} [params.out_request_no] - 外部请求编号
 * @param {string} [params.split_request_no] - 分账请求流水号
 * @param {string} [params.trade_no] - 交易单号
 * @returns {Promise<{out_request_no, split_status, split_list}>}
 */
export async function querySplit(params) {
  return request.post('/api/qzt/proxy', { service: 'trade.balance.split.query', params })
}

/**
 * 分账撤销
 * @param {object} params
 * @param {string} params.out_request_no - 外部请求编号
 * @param {string} params.merchant_id - 商户ID
 * @param {string} params.split_request_no - 原分账请求流水号
 * @returns {Promise<{out_request_no, revoke_status}>}
 */
export async function revokeSplit(params) {
  return request.post('/api/qzt/proxy', { service: 'trade.balance.split.cancel', params })
}

/**
 * 交易记录查询
 * @param {object} params
 * @param {string} params.account_no - 账户号
 * @param {string} [params.start_date] - 开始日期 yyyyMMdd
 * @param {string} [params.end_date] - 截止日期 yyyyMMdd
 * @param {string} [params.page] - 页码
 * @param {string} [params.page_size] - 每页条数
 * @returns {Promise<{total, records: Array}>}
 */
export async function queryTransactionList(params) {
  return request.post('/api/qzt/proxy', { service: 'trade.trans.list', params })
}

/**
 * 交易详情查询
 * @param {string} transNo - 交易单号
 * @returns {Promise<object>}
 */
export async function queryTransactionDetail(transNo) {
  return request.post('/api/qzt/proxy', { service: 'trade.trans.detail', params: { trans_no: transNo } })
}

/**
 * 充值记录查询
 * @param {object} params - 二选一
 * @param {string} [params.out_request_no]
 * @param {string} [params.recharge_seq_no]
 * @returns {Promise<object>}
 */
export async function queryRechargeRecords(params) {
  return request.post('/api/qzt/proxy', { service: 'trade.recharge.list', params })
}

/**
 * 开户记录查询
 * @param {object} params
 * @param {string} [params.merchant_id]
 * @param {string} [params.start_date]
 * @param {string} [params.end_date]
 * @returns {Promise<object>}
 */
export async function queryOpenAccountRecords(params) {
  return request.post('/api/qzt/proxy', { service: 'trade.openaccount.list', params })
}
