/**
 * 钱账通·分账服务
 * 分账方开户、协议、分账等接口
 */
import { qztRequest } from '../request.js'

/**
 * 分账方开户申请
 * @param {object} params - 开户参数（身份证、营业执照、账户许可证等）
 */
export async function openSplitAccountApply(params) {
  return qztRequest('splitaccount.open.apply', params)
}

/**
 * 分账方开户确认
 * @param {object} params - 确认参数
 */
export async function confirmSplitAccount(params) {
  return qztRequest('splitaccount.open.confirm', params)
}

/**
 * 分账方开户通知查询
 * @param {object} params - 查询参数
 */
export async function querySplitAccountNotify(params = {}) {
  return qztRequest('splitaccount.notify.query', params)
}

/**
 * 分账（分账请求）
 * @param {object} params - 分账参数（账户号、订单号、分账明细等）
 */
export async function split(params) {
  return qztRequest('splitaccount.split.apply', params)
}

/**
 * 分账结果查询
 * @param {string} splitNo - 分账单号
 */
export async function querySplitResult(splitNo) {
  return qztRequest('splitaccount.split.query', { split_no: splitNo })
}

/**
 * 补充分账协议
 * @param {object} params - 协议参数
 */
export async function supplementAgreement(params) {
  return qztRequest('splitaccount.agreement.supplement', params)
}

/**
 * 电子签章申请
 * @param {object} params - 签章参数
 */
export async function eSignApply(params) {
  return qztRequest('splitaccount.esign.apply', params)
}

/**
 * 电子签章查询
 * @param {string} applyNo - 申请单号
 */
export async function queryESign(applyNo) {
  return qztRequest('splitaccount.esign.query', { apply_no: applyNo })
}
