/**
 * 钱账通客户端
 *
 * 通过BFF代理层调用钱账通，取代前端直调
 */

import { md5ArrayBuffer } from './md5.js'

/**
 * 统一请求入口
 * @param {string} service  服务名，如 'file.upload.commn'
 * @param {Object} params   业务参数
 */
export const qztRequest = async (service, params) => {
  const requestBody = {
    service,
    params,
  }

  const resp = await fetch('/api/qzt/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })

  if (!resp.ok) throw new Error(`QZT Proxy HTTP ${resp.status}`)

  const data = await resp.json()
  
  if (data.status === 'FAIL') {
    throw new Error(`${data.error_code}: ${data.message}`)
  }

  // 服务端返回的 result 可能是 base64 或者是对象
  let result = data.result
  if (typeof result === 'string') {
     try {
       result = JSON.parse(atob(result))
     } catch (e) {
       // do nothing
     }
  }
  return result
}

// ==================== 文件上传 ====================

/**
 * 上传文件到钱账通（file.upload.commn）
 * @param {File} file
 * @param {string} fileName
 * @param {string} fileType  文件后缀（jpg/png/pdf）
 */
export const qztFileUpload = async (file, fileName, fileType) => {
  const arrayBuffer = await file.arrayBuffer()
  const fileHash = md5ArrayBuffer(arrayBuffer)

  // 转为 Base64
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const fileContent = btoa(binary)

  const result = await qztRequest('file.upload.commn', {
    file_name: fileName,
    file_type: fileType,
    file_hash: fileHash,
    file_content: fileContent,
  })

  return result.file_key
}

// ==================== 商户开户 ====================

/**
 * 申请开通支付账户（兼容方法，实际由 BFF 提供开户接口）
 * @param {Object} data
 */
export const qztOpenPayAccount = async (data) => {
  // 发送到 BFF 代为处理，如果是走 H5 页面获取 url
  // 可以继续使用 qztRequest('open.pay.account.page.url', ...) 
  const result = await qztRequest('open.pay.account.page.url', {
    register_name: data.registerName,
    enterprise_type: data.enterpriseType,    // 1=有限责任公司
    legal_name: data.legalName,
    legal_mobile: data.legalMobile,
    // business_license: encrypt(data.businessLicense, CLOUD_PUBLIC_KEY), 
    // ^加密应该转到BFF或者保留原来逻辑但BFF直传
    // 这里做个简单传递，要求BFF负责加密处理
    business_license: data.businessLicense,
    back_url: data.backUrl || location.origin + '/merchant/callback',
  })
  return {
    redirectUrl: result.redirect_url || result.page_url,
    accountNo: result.account_no,
  }
}
