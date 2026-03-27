/**
 * 钱账通·分账服务
 * 文档：Chapter 6.3 / 6.10-6.12 / 7.1-7.2 / 7.8-7.9
 * 通知：SPLIT_ACCOUNT_OPEN_NOTIFY（Chapter 8.3）/ TRADE_BALANCE_SPLIT_NOTIFY（Chapter 8.5）
 */
import { qztRequest } from '../request.js'

/**
 * 获取分账方开户页面 URL
 * @param {object} params
 * @param {string} params.out_request_no - 外部请求编号（全局唯一）
 * @param {string} [params.merchant_id] - 商户ID（开户后传入）
 * @param {string} params.split_name - 分账方名称
 * @param {string} params.split_type - 分账类型：1=个人，2=企业
 * @param {string} [params.account_no] - 账户号
 * @param {string} [params.account_name] - 账户名称
 * @param {string} [params.bank_code] - 银行代码
 * @param {string} [params.notify_url] - 异步通知地址
 * @returns {Promise<{out_request_no, url}>}
 */
export async function getOpenPageUrl(params) {
  return qztRequest('open.split.account.page.url', params)
}

/**
 * 分账方开户申请（提交资料）
 * @param {object} params
 * @param {string} params.out_request_no - 外部请求编号
 * @param {string} [params.merchant_id] - 商户ID
 * @param {string} params.split_name - 分账方名称
 * @param {string} params.split_type - 分账类型：1=个人，2=企业
 * @param {string} [params.id_card_no] - 身份证号（加密）
 * @param {string} [params.id_card_front] - 身份证正面 file_no
 * @param {string} [params.id_card_back] - 身份证反面 file_no
 * @param {string} [params.business_license] - 营业执照（加密）
 * @param {string} [params.business_license_photo] - 营业执照照片 file_no
 * @param {string} [params.account_permit_photo] - 账户许可证照片 file_no
 * @returns {Promise<{out_request_no, split_apply_no}>}
 */
export async function applyOpen(params) {
  return qztRequest('split.account.apply', params)
}

/**
 * 分账方开户确认（验证码）
 * @param {object} params
 * @param {string} params.out_request_no - 外部请求编号
 * @param {string} params.split_apply_no - 分账方开户申请流水号
 * @param {string} params.sms_code - 短信验证码
 * @returns {Promise<{out_request_no, split_id}>}
 */
export async function confirmOpen(params) {
  return qztRequest('split.account.confirm', params)
}

/**
 * 分账方开户结果查询（主动）
 * @param {object} params
 * @param {string} params.out_request_no - 外部请求编号
 * @returns {Promise<{out_request_no, merchant_id, split_id, status, ...}>}
 */
export async function queryOpenResult(params) {
  return qztRequest('split.account.query', params)
}

/**
 * 分账方协议补录
 * @param {object} params
 * @param {string} params.out_request_no - 外部请求编号
 * @param {string} params.split_id - 分账方ID
 * @param {string} params.merchant_id - 商户ID
 * @returns {Promise<{out_request_no, url}>}
 */
export async function supplementAgreement(params) {
  return qztRequest('split.account.agreement.supplement', params)
}

/**
 * 交易分账（余额分账）
 * @param {object} params
 * @param {string} params.out_request_no - 外部请求编号（全局唯一）
 * @param {string} params.merchant_id - 商户ID
 * @param {string} params.trade_no - 交易单号
 * @param {Array<{split_id: string, amount: string, remark?: string}>} params.split_list - 分账明细列表
 * @returns {Promise<{out_request_no, split_status}>}
 */
export async function split(params) {
  return qztRequest('trade.balance.split', params)
}

/**
 * 交易分账结果查询
 * @param {object} params - 二选一
 * @param {string} [params.out_request_no] - 外部请求编号
 * @param {string} [params.split_request_no] - 分账请求流水号
 * @param {string} [params.trade_no] - 交易单号
 * @returns {Promise<{out_request_no, split_status, split_list}>}
 */
export async function querySplitResult(params) {
  return qztRequest('trade.balance.split.query', params)
}

/**
 * 分账记录查询（交易流水）
 * @param {object} params
 * @param {string} params.account_no - 账户号
 * @param {string} [params.start_date] - 开始日期 yyyyMMdd
 * @param {string} [params.end_date] - 截止日期 yyyyMMdd
 * @param {string} [params.page] - 页码
 * @param {string} [params.page_size] - 每页条数
 * @returns {Promise<{total, records: Array}>}
 */
export async function querySplitRecords(params) {
  return qztRequest('trade.split.list', params)
}
