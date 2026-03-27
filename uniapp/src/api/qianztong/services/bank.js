/**
 * 钱账通·银行卡账户服务
 * 文档：Chapter 6.1 / 6.4-6.9 / 7.4-7.6
 * 通知：BANK_ACCOUNT_OPEN_NOTIFY（Chapter 8.2）
 */
import { qztRequest } from '../request.js'

/**
 * 获取银行卡开户页面 URL
 * @param {object} params
 * @param {string} params.out_request_no - 外部请求编号（全局唯一）
 * @param {string} params.register_name - 注册名称
 * @param {string} params.legal_mobile - 法人手机号
 * @param {string} params.enterprise_type - 企业类型：1=企业，2=个体工商户
 * @param {string} [params.business_scope] - 经营类目代码
 * @param {string} [params.registered_capital] - 注册资本（如 100000）
 * @param {string} [params.legal_name] - 法人姓名
 * @param {string} [params.legal_id] - 法人身份证（加密）
 * @param {string} [params.legal_id_start_date] - 法人证件有效期开始 yyyy-MM-dd
 * @param {string} [params.legal_id_end_date] - 法人证件有效期截止 yyyy-MM-dd / 9999-12-31
 * @param {string} [params.legal_id_front] - 法人身份证正面 file_no
 * @param {string} [params.legal_id_back] - 法人身份证反面 file_no
 * @param {string} [params.business_license_photo] - 营业执照照片 file_no
 * @param {string} [params.address] - 详细地址
 * @param {string} [params.operator_name] - 经办人姓名
 * @param {string} [params.operator_id] - 经办人身份证（加密）
 * @param {string} [params.operator_mobile] - 经办人手机号
 * @param {string} [params.operator_id_front] - 经办人身份证正面 file_no
 * @param {string} [params.operator_id_back] - 经办人身份证反面 file_no
 * @param {string} [params.bank_type] - 银行账户类型：1=对公，2=对私
 * @param {string} [params.bank_code] - 银行代码
 * @returns {Promise<{out_request_no, url}>}
 */
export async function getOpenPageUrl(params) {
  return qztRequest('open.bank.account.page.url', params)
}

/**
 * 银行卡开户结果查询（主动）
 * @param {object} params
 * @param {string} params.out_request_no - 外部请求编号
 * @returns {Promise<{out_request_no, merchant_id, bank_account_no, status, ...}>}
 */
export async function queryOpenResult(params) {
  return qztRequest('merchant.query.final', params)
}

/**
 * 银行卡开户证明查询
 * @param {object} params
 * @param {string} params.out_request_no - 外部请求编号
 * @param {string} params.merchant_id - 商户ID
 * @returns {Promise<{out_request_no, file_no}>}
 */
export async function queryVoucher(params) {
  return qztRequest('bank.account.voucher.query', params)
}

/**
 * 绑定银行卡
 * @param {object} params
 * @param {string} params.out_request_no - 外部请求编号
 * @param {string} params.merchant_id - 商户ID
 * @param {string} params.card_no - 卡号
 * @param {string} params.card_holder - 持卡人姓名
 * @param {string} params.id_no - 证件号（加密）
 * @param {string} params.mobile - 银行预留手机号
 * @returns {Promise<{out_request_no, merchant_id, bind_no}>}
 */
export async function bindCard(params) {
  return qztRequest('card.bind', params)
}

/**
 * 解除绑定银行卡
 * @param {object} params
 * @param {string} params.out_request_no - 外部请求编号
 * @param {string} params.merchant_id - 商户ID
 * @param {string} params.bind_no - 绑定编号
 * @returns {Promise<{out_request_no, merchant_id}>}
 */
export async function unbindCard(params) {
  return qztRequest('card.unbind', params)
}

/**
 * 账户提现（发送验证码）
 * @param {object} params - 二选一
 * @param {string} [params.withdraw_seq_no] - 提现流水号
 * @param {string} [params.out_request_no] - 外部请求编号
 * @returns {Promise<{out_request_no, withdraw_seq_no, ...}>}
 */
export async function withdrawSendSms(params) {
  return qztRequest('account.withdraw.sms.send', params)
}

/**
 * 账户提现（确认）
 * @param {object} params
 * @param {string} [params.withdraw_seq_no] - 提现流水号
 * @param {string} [params.out_request_no] - 外部请求编号
 * @param {string} params.sms_code - 短信验证码
 * @returns {Promise<{out_request_no, withdraw_seq_no, withdraw_state, ...}>}
 */
export async function withdrawConfirm(params) {
  return qztRequest('account.withdraw.confirm', params)
}

/**
 * 账户提现结果查询
 * @param {object} params - 二选一
 * @param {string} [params.withdraw_seq_no] - 提现流水号
 * @param {string} [params.out_request_no] - 外部请求编号
 * @returns {Promise<{out_request_no, withdraw_seq_no, withdraw_state, amount, fee, ...}>}
 */
export async function queryWithdraw(params) {
  return qztRequest('account.withdraw.query', params)
}
