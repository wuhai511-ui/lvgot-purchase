/**
 * 钱账通·交易查询服务
 * 订单、交易记录、分账记录等查询接口
 */
import { qztRequest } from '../request.js'

/**
 * 交易记录查询
 * @param {object} params - 查询参数（accountNo, startDate, endDate, pageNum, pageSize）
 */
export async function queryTransactionList(params) {
  return qztRequest('trade.trans.list', params)
}

/**
 * 交易详情查询
 * @param {string} transNo - 交易单号
 */
export async function queryTransDetail(transNo) {
  return qztRequest('trade.trans.detail', { trans_no: transNo })
}

/**
 * 分账记录查询
 * @param {object} params - 查询参数
 */
export async function querySplitRecords(params) {
  return qztRequest('trade.split.list', params)
}

/**
 * 分账明细查询
 * @param {string} splitNo - 分账单号
 */
export async function querySplitDetail(splitNo) {
  return qztRequest('trade.split.detail', { split_no: splitNo })
}

/**
 * 充值记录查询
 * @param {object} params - 查询参数
 */
export async function queryTopUpRecords(params) {
  return qztRequest('trade.topup.list', params)
}

/**
 * 开户记录查询
 * @param {object} params - 查询参数
 */
export async function queryOpenAccountRecords(params) {
  return qztRequest('trade.openaccount.list', params)
}
