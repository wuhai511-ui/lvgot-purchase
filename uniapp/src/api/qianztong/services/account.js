/**
 * 钱账通·支付账户开户服务
 * 文档：Chapter 6.2 - 支付账户开户
 * 通知：PAY_ACCOUNT_OPEN_NOTIFY（Chapter 8.1）
 */
import request from '@/utils/request.js'

/**
 * 获取支付账户开户页面 URL
 * @param {object} params
 * @param {string} params.out_request_no - 外部请求编号（全局唯一）
 * @param {string} params.register_name - 企业/个人注册名称
 * @param {string} params.short_name - 企业简称
 * @param {string} params.enterprise_type - 企业类型：1=企业，2=个体工商户，3=个人
 * @param {string} params.legal_name - 法人姓名
 * @param {string} params.legal_id - 法人身份证号（加密）
 * @param {string} [params.legal_id_type] - 法人证件类型：1=身份证
 * @param {string} [params.legal_id_start_date] - 法人证件有效期开始 yyyy-MM-dd
 * @param {string} [params.legal_id_end_date] - 法人证件有效期截止 yyyy-MM-dd / 9999-12-31（长期）
 * @param {string} [params.legal_id_front] - 法人身份证正面 file_no
 * @param {string} [params.legal_id_back] - 法人身份证反面 file_no
 * @param {string} [params.business_license_name] - 营业执照名称
 * @param {string} [params.business_license] - 统一社会信用代码（加密）
 * @param {string} [params.business_license_start_date] - 营业执照有效期开始
 * @param {string} [params.business_license_end_date] - 营业执照有效期截止
 * @param {string} [params.business_license_photo] - 营业执照照片 file_no
 * @param {string} [params.address] - 详细地址
 * @param {string} [params.business_province] - 经营省代码
 * @param {string} [params.business_city] - 经营市代码
 * @param {string} [params.business_area] - 经营区代码
 * @param {string} [params.operator_info_legal] - 经办人是否为法人：TRUE / FALSE
 * @param {string} [params.operator_name] - 经办人姓名
 * @param {string} [params.operator_id] - 经办人身份证（加密）
 * @param {string} [params.operator_mobile] - 经办人手机号
 * @param {string} [params.notify_url] - 异步通知地址
 * @returns {Promise<{out_request_no, url, merchant_id}>}
 */
export async function getOpenPageUrl(params) {
  // Demo Mode: Mock the URL directly since front-end doesn't have secure private key access for real signing
  if (true) {
     return new Promise((resolve) => {
        setTimeout(() => {
           resolve({
             out_request_no: params.out_request_no,
             url: 'https://qztuat.xc-fintech.com/qzt-h5/open-account?mock=1',
             merchant_id: '82230000100'
           })
        }, 800)
     })
  }

  return request.post('/api/qzt/proxy', { service: 'open.pay.account.page.url', params })
}

/**
 * 支付账户开户结果查询（主动）
 * @param {object} params
 * @param {string} params.out_request_no - 外部请求编号
 * @returns {Promise<{out_request_no, merchant_id, account_no, status, ...}>}
 */
export async function queryOpenResult(params) {
  return request.post('/api/qzt/proxy', { service: 'open.pay.account.cert.query', params })
}

/**
 * 账户充值
 * @param {object} params
 * @param {string} params.out_request_no - 外部请求编号
 * @param {string} params.account_no - 账户号
 * @param {string} params.recharge_amt - 充值金额（单位：分）
 * @param {string} [params.recharge_desc] - 充值备注（最多80字）
 * @param {string} params.back_url - 通知地址
 * @returns {Promise<{out_request_no, recharge_seq_no, recharge_state, ...}>}
 */
export async function recharge(params) {
  return request.post('/api/qzt/recharge/pre-order', params)
}

/**
 * 账户充值查询
 * @param {object} params - 二选一
 * @param {string} [params.out_request_no] - 外部请求编号
 * @param {string} [params.recharge_seq_no] - 充值流水号
 * @returns {Promise<{recharge_seq_no, recharge_state, recharge_amount, ...}>}
 */
export async function queryRecharge(params) {
  return request.get('/api/qzt/recharge/status', params)
}

/**
 * 账户余额查询
 * @param {object} params
 * @param {string} params.account_no - 账户号
 * @returns {Promise<{account_no, available_amount, trans_amount}>}
 * available_amount: 可用余额（分）
 * trans_amount: 挂账余额（分）
 */
export async function queryBalance(params) {
  return request.post('/api/qzt/proxy', { service: 'account.balance.query', params })
}

/**
 * 账户流水查询（交易历史）
 * @param {object} params
 * @param {string} params.account_no - 账户号
 * @param {string} params.start_date - 开始日期 yyyyMMdd
 * @param {string} params.end_date - 截止日期 yyyyMMdd（不超过30天）
 * @param {string} params.page - 页码
 * @param {string} params.page_size - 每页条数（最大30）
 * @param {string} [params.account_code] - 账户类型：1000=现金账户（默认）
 * @param {string} [params.sort] - 排序：asc / desc（默认 desc）
 * @returns {Promise<{total, records: [{flow_no, cur_amount, chg_amount, loan_flag, chg_time, chg_type, chg_sub_type, busi_desc}]}>}
 */
export async function queryFlow(params) {
  return request.post('/api/qzt/proxy', { service: 'account.flow.query', params })
}

/**
 * OCR 身份证识别（提交）
 * @param {object} params
 * @param {string} params.out_request_no - 外部请求编号
 * @param {string} params.file_id - 文件 file_no
 * @param {string} params.type - 文档类型：1=营业执照，2=身份证正面，3=身份证反面
 * @param {string} params.source - 来源：0=PC，1=Android，2=iOS
 * @returns {Promise<{out_request_no, seq_no}>}
 */
export async function ocrRecognize(params) {
  return request.post('/api/qzt/proxy', { service: 'ocr.idcard', params })
}

/**
 * OCR 识别结果查询
 * @param {string} seqNo - OCR 流水号
 * @returns {Promise<{status, id_card_name, id_card_no, id_card_sex, ...}>}
 */
export async function queryOcrResult(seqNo) {
  return request.post('/api/qzt/proxy', { service: 'ocr.idcard.query', params: { seq_no: seqNo } })
}
