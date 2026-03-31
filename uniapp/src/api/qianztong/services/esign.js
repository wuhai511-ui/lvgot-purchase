/**
 * 钱账通·电子签章服务
 * 文档：Chapter 10
 * service_type: 01=拉卡拉电签，02=安心签（默认）
 */
import request from '@/utils/request.js'

/**
 * 企业电签账户开户
 * @param {object} params
 * @param {string} params.enterprise_type - 主体类型：1=企业，2=个体工商户
 * @param {string} params.business_license - 统一社会信用代码（加密）
 * @param {string} params.business_license_name - 企业名称
 * @param {string} params.legal_id - 法人身份证（加密）
 * @param {string} params.legal_name - 法人姓名
 * @param {string} params.legal_id_type - 法人证件类型：1=身份证
 * @param {string} params.legal_mobile - 法人手机号
 * @param {string} [params.operator_id] - 经办人身份证（加密），默认同法人
 * @param {string} [params.operator_name] - 经办人姓名
 * @param {string} [params.operator_mobile] - 经办人手机号
 * @param {string} [params.service_type] - 电签服务商：01=拉卡拉，02=安心签（默认）
 * @returns {Promise<{user_id, operator_id}>}
 */
export async function openEnterpriseAccount(params) {
  return request.post('/api/qzt/proxy', { service: 'esign.open.enterprise.account', params })
}

/**
 * 个人电签账户开户
 * @param {object} params
 * @param {string} params.id_no - 身份证号（加密）
 * @param {string} params.name - 姓名
 * @param {string} params.id_type - 证件类型：1=身份证
 * @param {string} params.mobile - 手机号
 * @param {string} [params.service_type] - 电签服务商
 * @returns {Promise<{user_id}>}
 */
export async function openPersonalAccount(params) {
  return request.post('/api/qzt/proxy', { service: 'esign.open.person.account', { enterprise_type: '3', ...params })
}

/**
 * 初始化合同（获取申请号）
 * @param {object} params
 * @param {string} [params.template_no] - 模板编号（默认 01）
 * @param {string} [params.service_type] - 电签服务商
 * @returns {Promise<{sys_seq_no}>}
 */
export async function initContract(params) {
  return request.post('/api/qzt/proxy', { service: 'esign.contract.init', params })
}

/**
 * 创建合同
 * @param {object} params
 * @param {string} params.sys_seq_no - 申请流水号
 * @param {string} params.template_no - 模板编号
 * @param {object} params.template_fields - 模板填充字段 {A1: '值1', A2: '值2'}
 * @param {Array<{user_id: string, sign_location: string}>} params.sign_fields - 签章字段列表
 * @param {string} [params.service_type] - 电签服务商
 * @returns {Promise<{sys_seq_no, contract_no}>}
 */
export async function createContract(params) {
  return request.post('/api/qzt/proxy', { service: 'esign.contract.create', params })
}

/**
 * 下载合同
 * @param {object} params
 * @param {string} params.contract_no - 合同编号
 * @param {string} [params.service_type] - 电签服务商
 * @returns {Promise<{contract_no, contract_content}>} contract_content 为 Base64 编码
 */
export async function downloadContract(params) {
  return request.post('/api/qzt/proxy', { service: 'esign.contract.download', params })
}

/**
 * 发送签约短信
 * @param {object} params
 * @param {string} params.sys_seq_no - 申请流水号
 * @param {string} params.contract_no - 合同编号
 * @param {string} params.user_id - 签署人 user_id
 * @param {string} [params.service_type] - 电签服务商
 * @returns {Promise<{status, error_message?}>}
 */
export async function sendSignSms(params) {
  return request.post('/api/qzt/proxy', { service: 'esign.contract.sms.send', params })
}

/**
 * 验证签约短信
 * @param {object} params
 * @param {string} params.sys_seq_no - 申请流水号
 * @param {string} params.contract_no - 合同编号
 * @param {string} params.user_id - 签署人 user_id
 * @param {string} params.sms_code - 短信验证码
 * @param {string} [params.service_type] - 电签服务商
 * @returns {Promise<{status, error_message?}>}
 */
export async function validSignSms(params) {
  return request.post('/api/qzt/proxy', { service: 'esign.contract.sms.valid', params })
}

/**
 * 签署合同
 * @param {object} params
 * @param {string} params.sys_seq_no - 申请流水号
 * @param {string} params.contract_no - 合同编号
 * @param {string} params.user_id - 签署人 user_id
 * @param {string} params.sign_location - 签章区域标识，多个用冒号分隔
 * @param {string} [params.service_type] - 电签服务商
 * @returns {Promise<{status, error_message?}>}
 */
export async function signContract(params) {
  return request.post('/api/qzt/proxy', { service: 'esign.contract.sign', params })
}

/**
 * 修改联系方式
 * @param {object} params
 * @param {string} params.user_id - 用户ID
 * @param {string} params.mobile - 新手机号
 * @param {string} [params.service_type] - 电签服务商
 * @returns {Promise<{status, error_message?}>}
 */
export async function modifyMobile(params) {
  return request.post('/api/qzt/proxy', { service: 'esign.user.mobile.modify', params })
}

/**
 * 查询联系方式
 * @param {object} params
 * @param {string} params.user_id - 用户ID
 * @param {string} [params.service_type] - 电签服务商
 * @returns {Promise<{mobile}>}
 */
export async function queryMobile(params) {
  return request.post('/api/qzt/proxy', { service: 'esign.user.mobile.query', params })
}
