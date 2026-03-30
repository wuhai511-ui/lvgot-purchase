/**
 * 商户相关 API（BFF → 钱账通）
 * BFF Base URL: https://bgualqb.cn
 * 钱账通签名/加密由 BFF 后端处理
 */
import { post } from './request.js'

const BASE = '/api/v1/merchants'

/**
 * 手机号+验证码登录（Mock）
 */
export const merchantLogin = (phone, code) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        code: 0,
        data: {
          token: 'mock_jwt_' + Date.now(),
          merchantInfo: {
            id: 'm_mock_1',
            phone,
            name: '测试商户',
            status: 'active',
            accountNo: 'LAK2026030001'
          }
        }
      })
    }, 800)
  })
}

/**
 * 文件上传
 * 前端将文件传给 BFF，BFF 调用钱账通 file.upload.commn，返回 file_key
 * @param {File} file
 * @returns {Promise<string>} file_key
 */
export const uploadFile = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('file_type', file.name.split('.').pop())
  formData.append('file_name', file.name)
  return post('/api/v1/merchants/upload', formData, true)
    .then(r => r.data?.file_key || '')
  // 真实接口由 BFF 转发到钱账通 file.upload.commn
  // 返回格式: { code: 0, data: { file_key: "xxx" } }
}

/**
 * 商户开户申请
 * 前端上传所有证件 + 填写完整表单 → BFF → 钱账通 open.pay.account.page.url
 * BFF 返回钱账通 H5 跳转 URL
 * @param {Object} data 开户表单数据（含 file_key）
 */
export const openAccount = (data) => {
  return post(BASE, {
    // 商户基本信息
    name: data.name,
    enterprise_type: data.businessType,
    legal_name: data.legalName,
    legal_mobile: data.legalPhone,
    legal_id_card: data.legalIdCard,
    business_license: data.licenseNo,
    industry: data.industryCode,
    business_address: data.businessAddress,
    business_scope: data.businessScope,

    // 结算账户信息
    account_type: data.accountType,
    settlement_bank: data.bankName,
    settlement_account: data.bankCardNo,
    settlement_account_name: data.bankAccountName,
    settlement_bank_branch: data.bankBranchName,
    open_permit_no: data.openPermitNo,

    // 证件照片 file_key（由 uploadFile 上传到钱账通后获得）
    business_license_photo: data.licenseKey,
    legal_id_card_front: data.idCardFrontKey,
    legal_id_card_back: data.idCardBackKey,
    settlement_account_photo: data.bankCardKey,

    // 回调地址（钱账通认证完成后回调我们的 BFF）
    back_url: window.location.origin + '/merchant/callback',

    // 来源标记
    source: 'WORKBENCH'
  })
  // 真实接口由 BFF 完成：
  // 1. 保存商户信息到数据库（状态=pending）
  // 2. BFF 调用钱账通 open.pay.account.page.url（RSA签名+加密）
  // 3. BFF 返回 { code: 0, data: { redirect_url: "https://qzt.xc-fintech.com/..." } }
}

/**
 * 查询商户开户状态
 * @param {string} merchantId
 */
export const getMerchantStatus = (merchantId) => {
  return post(`${BASE}/status`, { merchant_id: merchantId })
}

/**
 * 获取商户详情
 * @param {string} merchantId
 */
export const getMerchantInfo = (merchantId) => {
  return post(`${BASE}/detail`, { merchant_id: merchantId })
}

/**
 * 商户列表
 * @param {Object} params page, pageSize, status, industry
 */
export const getMerchantList = (params) => {
  return post(`${BASE}/list`, params)
}
