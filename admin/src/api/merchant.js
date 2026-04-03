/**
 * 商户相关 API（BFF → 钱账通）
 * BFF Base URL: https://bgualqb.cn
 * 所有请求由 BFF 代理转发到钱账通，解决前端 CORS 问题
 */
import { post, upload } from './request.js'

const BASE = '/api/merchant'

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
 * 文件上传（通过 BFF 代理到钱账通）
 * @param {File} file
 * @returns {Promise<string>} file_key
 */
export const uploadFile = async (file) => {
  const arrayBuffer = await file.arrayBuffer()
  
  // 转为 Base64
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const fileContent = btoa(binary)
  
  return post('/api/merchant/upload', {
    file_name: file.name,
    file_type: file.name.split('.').pop() || 'jpg',
    file_content: fileContent
  }).then(r => r.data?.file_key || '')
}

/**
 * 商户开户申请（通过 BFF 代理到钱账通）
 * BFF 内部调用钱账通 open.pay.account.page.url，返回 redirect_url
 */
export const openAccount = (data) => {
  return post(BASE, {
    name: data.name,
    legal_mobile: data.legal_mobile,
    back_url: data.back_url || location.origin + '/merchant/callback',
    source: data.source || 'WORKBENCH'
  })
}

export const getMerchantStatus = (merchantId) => {
  return post(`${BASE}/status`, { merchant_id: merchantId })
}

export const getMerchantInfo = (merchantId) => {
  return post(`${BASE}/detail`, { merchant_id: merchantId })
}

export const getMerchantList = (params) => {
  return post(`${BASE}/list`, params)
}

/**
 * 个人商户开户申请（导游/咨询师等）
 * POST /api/merchant/apply-personal
 */
export const applyPersonal = (data) => {
  return post(`${BASE}/apply-personal`, {
    out_request_no: data.out_request_no,
    register_name: data.register_name,
    legal_mobile: data.legal_mobile,
    enterprise_type: data.enterprise_type || '3',
    back_url: data.back_url || '',
    name: data.name,
    id_card_no: data.id_card_no,
    bank_name: data.bank_name,
    bank_account_no: data.bank_account_no,
    bank_account_name: data.bank_account_name,
    bank_province: data.bank_province,
    bank_city: data.bank_city,
    bank_branch_name: data.bank_branch_name,
    role_type: data.role_type || 'OTHER',
    source: 'WORKBENCH'
  })
}

/**
 * 调用 BFF OCR 识别接口
 * POST /api/merchant/ocr
 * @param {string} fileKey - 上传后得到的 file_key
 * @param {string} type - front=身份证正面, back=身份证反面, license=营业执照
 */
export const callOCR = (fileKey, type) => {
  const typeMap = { front: '2', back: '3', license: '1' }
  return post(`${BASE}/ocr`, {
    file_key: fileKey,
    type: typeMap[type] || '2',
  })
}

/**
 * 充值预下单
 * POST /api/qzt/recharge/pre-order
 */
export const rechargePreOrder = (data) => {
  return post('/api/qzt/recharge/pre-order', {
    amount: data.amount,
    account_type: data.accountType || 'lakala',
  })
}

/**
 * 充值状态查询
 * GET /api/qzt/recharge/status?order_no=xxx
 */
export const rechargeStatus = (orderNo) => {
  return post('/api/qzt/recharge/status', { order_no: orderNo })
}

/**
 * 分账预下单
 * POST /api/qzt/split/pre-order
 */
export const splitPreOrder = (data) => {
  return post('/api/qzt/split/pre-order', data)
}

/**
 * 分账确认
 * POST /api/qzt/split/confirm
 */
export const splitConfirm = (data) => {
  return post('/api/qzt/split/confirm', data)
}

/**
 * 提现预下单
 * POST /api/qzt/withdraw/pre-order
 */
export const withdrawPreOrder = (data) => {
  return post('/api/qzt/withdraw/pre-order', data)
}

/**
 * 获取商户人脸识别URL
 * GET /api/merchant/:id/face-recognition-url
 */
export const getFaceRecognitionUrl = (merchantId) => {
  return post(`${BASE}/${merchantId}/face-recognition-url`, {})
}
