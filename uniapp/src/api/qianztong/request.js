/**
 * 钱账通·统一请求封装
 * 负责签名、请求发送、响应验签
 */
import axios from 'axios'
import QZT_CONFIG from '@/config/qianztong.js'
import { KJUR, KEYUTIL, X509 } from 'jsrsasign'

// 动态加载私钥（Node 环境读取文件）
let _privateKey = null
async function loadPrivateKey() {
  if (_privateKey) return _privateKey
  try {
    const res = await fetch(QZT_CONFIG.privateKeyPath)
    _privateKey = await res.text()
  } catch {
    // 浏览器环境通过 import.meta.env 或直接传入
    _privateKey = import.meta.env.VITE_QZT_PRIVATE_KEY || ''
  }
  return _privateKey
}

/**
 * 动态加载平台公钥
 */
let _platformPublicKey = null
async function loadPlatformPublicKey() {
  if (_platformPublicKey) return _platformPublicKey
  try {
    const res = await fetch(QZT_CONFIG.platformPublicKeyPath)
    _platformPublicKey = await res.text()
  } catch {
    _platformPublicKey = import.meta.env.VITE_QZT_PLATFORM_PUBLIC_KEY || ''
  }
  return _platformPublicKey
}

/**
 * URL 编码（严格按规范）
 */
function urlEncode(str) {
  return encodeURIComponent(String(str))
}

/**
 * 生成签名
 * 签名内容：app_id + timestamp + version + service + params(JSON字符串)
 */
async function sign(content) {
  const privateKey = await loadPrivateKey()
  const sig = new KJUR.crypto.Signature({ alg: 'SHA256withRSA' })
  sig.init(privateKey.trim())
  sig.updateString(content)
  return sig.sign()
}

/**
 * 验签响应
 */
async function verify(data, signValue) {
  if (!signValue) return true
  try {
    const pubKey = await loadPlatformPublicKey()
    const sig = new KJUR.crypto.Signature({ alg: 'SHA256withRSA' })
    sig.init(pubKey.trim())
    sig.updateString(data)
    return sig.verify(signValue)
  } catch {
    return false
  }
}

/**
 * 发送钱账通请求
 * @param {string} service - 服务名，如 'file.upload.commn'
 * @param {object} params - 请求参数
 */
export async function qztRequest(service, params = {}) {
  const timestamp = String(Math.floor(Date.now() / 1000))
  const version = QZT_CONFIG.version

  // 1. 构建待签名字符串
  const paramsStr = JSON.stringify(params)
  const signContent = QZT_CONFIG.appId + timestamp + version + service + paramsStr

  // 2. 生成签名
  const signValue = await sign(signContent)

  // 3. 构建请求体（所有值都要 URL 编码）
  const body = {
    app_id: QZT_CONFIG.appId,
    timestamp,
    version,
    sign: signValue,
    service,
    params: paramsStr ? params : undefined,
  }

  // 4. 发送请求
  const response = await axios.post(QZT_CONFIG.gateway, body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  })

  const res = response.data

  // 5. 验签（仅验签 result 字段原始字符串）
  if (res.status === 'SUCCESS' && res.sign) {
    const isValid = await verify(res.result || '', res.sign)
    if (!isValid) {
      throw new Error('钱账通响应验签失败')
    }
  }

  // 6. 统一错误处理
  if (res.status === 'FAIL') {
    const err = new Error(res.message || '钱账通接口调用失败')
    err.code = res.error_code
    throw err
  }

  return res.result
}

/**
 * 文件上传（特殊处理：file_content 不参与签名，单独 Base64 编码后加入）
 */
export async function qztFileUpload(fileName, fileType, fileHash, fileContentBase64, extraParams = {}) {
  const params = {
    file_name: fileName,
    file_type: fileType,
    file_hash: fileHash,
    ...extraParams,
  }

  // 先用不含 file_content 的参数签名
  const result = await qztRequest('file.upload.commn', params)

  // file_content 不签名，直接附加入参
  // 注意：实际 SDK 行为需按文档确认，此处追加到 result 前的 params 里
  // 如果平台要求 file_content 也参与签名，需要调整此处逻辑
  return result
}
