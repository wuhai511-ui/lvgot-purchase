/**
 * 钱账通·支付账户服务
 * 支付账户开户、查询、OCR 等接口
 */
import { qztRequest } from '../request.js'

/**
 * 支付账户开户申请
 * @param {object} params - 开户参数（姓名、手机号、身份证号等）
 */
export async function openAccount(params) {
  return qztRequest('payaccount.open.apply', params)
}

/**
 * 支付账户开户确认
 * @param {object} params - 确认参数（商户ID、验证码等）
 */
export async function confirmOpenAccount(params) {
  return qztRequest('payaccount.open.confirm', params)
}

/**
 * 支付账户查询
 * @param {string} accountNo - 账户号（可选）
 * @param {string} accountId - 账户ID（可选）
 */
export async function queryAccount(params = {}) {
  return qztRequest('payaccount.query', params)
}

/**
 * 支付账户通知回调查询（主动查询开户结果）
 * @param {object} params - 查询参数
 */
export async function queryAccountNotify(params = {}) {
  return qztRequest('payaccount.notify.query', params)
}

/**
 * OCR 身份证识别
 * @param {string} fileNo - 身份证图片 file_no
 */
export async function ocrIdCard(fileNo) {
  return qztRequest('payaccount.ocr.idcard', { file_no: fileNo })
}

/**
 * OCR 营业执照识别
 * @param {string} fileNo - 营业执照图片 file_no
 */
export async function ocrBusinessLicense(fileNo) {
  return qztRequest('payaccount.ocr.businesslicense', { file_no: fileNo })
}

/**
 * 账户充值
 * @param {object} params - 充值参数
 */
export async function topUp(params) {
  return qztRequest('payaccount.topup.apply', params)
}

/**
 * 账户充值查询
 * @param {string} topUpNo - 充值单号
 */
export async function queryTopUp(topUpNo) {
  return qztRequest('payaccount.topup.query', { topup_no: topUpNo })
}

/**
 * 交易历史查询
 * @param {object} params - 查询参数（accountNo, startDate, endDate, pageNum, pageSize）
 */
export async function queryTransactionHistory(params) {
  return qztRequest('payaccount.trans.list', params)
}
