/**
 * 钱账通客户端
 *
 * 前端直调钱账通测试环境
 *
 * 钱账通接口签名规则（RSA-SHA1 + PKCS1）：
 * signStr = app_id + timestamp + version + service + params.toJSONString()
 * sign = RSA-SHA1签名(signStr, 商户RSA私钥)
 *
 * 文件上传签名：
 * params = { file_name, file_type, file_hash, file_content }
 * signStr = app_id + timestamp + version + service + params.toJSONString()
 */

import { md5ArrayBuffer } from './md5.js'
import { RSA } from './rsa.js'

// ==================== 钱账通测试环境配置 ====================
const QZT = {
  appId: '7348882579718766592',
  serviceUrl: 'https://qztuat.xc-fintech.com/gateway/soa', // 测试环境
  version: '4.0',
}

// 商户RSA私钥（替换为真实私钥）
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEugIBADANBgkqhkiG9w0BAQEFAASCBKQwggSgAgEAAoIBAQC5
-----END PRIVATE KEY-----`

// 钱账通RSA公钥（用于验签）
const CLOUD_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwx+Q
-----END PUBLIC KEY-----`

/**
 * 生成唯一请求号
 */
const generateRequestNo = () =>
  `${Date.now()}${Math.random().toString(36).slice(2, 10)}`

/**
 * 统一请求入口
 * @param {string} service  服务名，如 'file.upload.commn'
 * @param {Object} params   业务参数（不含 out_request_no）
 */
export const qztRequest = async (service, params) => {
  const timestamp = String(Math.floor(Date.now() / 1000))
  const outRequestNo = generateRequestNo()

  const requestParams = { ...params, out_request_no: outRequestNo }

  // 签名原文 = app_id + timestamp + version + service + paramsJSON
  const signStr =
    QZT.appId + timestamp + QZT.version + service + JSON.stringify(requestParams)

  // RSA-SHA1 签名
  const signature = RSA.sign(signStr, PRIVATE_KEY)

  const requestBody = {
    app_id: QZT.appId,
    timestamp,
    version: QZT.version,
    service,
    params: requestParams,
    sign: signature,
  }

  console.log('[QZT Request]', JSON.stringify(requestBody, null, 2))

  const resp = await fetch(QZT.serviceUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })

  if (!resp.ok) throw new Error(`QZT HTTP ${resp.status}`)

  const data = await resp.json()
  console.log('[QZT Response]', JSON.stringify(data, null, 2))

  const body = data.body || data
  if (body.status !== 'SUCCESS') {
    throw new Error(`${body.error_code}: ${body.message}`)
  }

  // 验签（生产环境必须）
  const verifyOk = RSA.verify(CLOUD_PUBLIC_KEY, body.result, body.sign)
  if (!verifyOk) throw new Error('QZT 响应验签失败')

  return JSON.parse(body.result)
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
 * 申请开通支付账户
 * @param {Object} data
 */
export const qztOpenPayAccount = async (data) => {
  const result = await qztRequest('open.pay.account.page.url', {
    register_name: data.registerName,
    enterprise_type: data.enterpriseType,    // 1=有限责任公司
    legal_name: data.legalName,
    legal_mobile: data.legalMobile,
    business_license: RSA.encrypt(data.businessLicense, CLOUD_PUBLIC_KEY),
    back_url: data.backUrl || location.origin + '/merchant/callback',
  })
  return {
    redirectUrl: result.redirect_url || result.page_url,
    accountNo: result.account_no,
  }
}
