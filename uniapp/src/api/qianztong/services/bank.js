/**
 * 钱账通·银行卡账户服务
 * 银行卡绑定、解绑、查询等接口
 */
import { qztRequest } from '../request.js'

/**
 * 银行卡开户申请
 * @param {object} params - 开户参数
 */
export async function openBankAccount(params) {
  return qztRequest('bankaccount.open.apply', params)
}

/**
 * 银行卡开户确认
 * @param {object} params - 确认参数
 */
export async function confirmOpenBankAccount(params) {
  return qztRequest('bankaccount.open.confirm', params)
}

/**
 * 银行卡开户结果查询（主动查询）
 * @param {object} params - 查询参数
 */
export async function queryBankAccountNotify(params = {}) {
  return qztRequest('bankaccount.notify.query', params)
}

/**
 * 银行卡开户证明查询
 * @param {string} accountNo - 账户号
 */
export async function queryBankCertificate(accountNo) {
  return qztRequest('bankaccount.certificate.query', { account_no: accountNo })
}

/**
 * 银行卡解绑
 * @param {string} accountNo - 账户号
 * @param {string} cardNo - 卡号
 */
export async function unbindBankCard(accountNo, cardNo) {
  return qztRequest('bankaccount.unbind', { account_no: accountNo, card_no: cardNo })
}
