/**
 * 商户入驻 API
 */
import QZT_CONFIG from '@/config/qianztong.js'

const BASE_URL = QZT_CONFIG.gateway.replace('/gateway/soa', '')

/**
 * 上传证件照片到钱账通，返回 file_key
 * @param {string} fileName - 文件名
 * @param {string} fileType - 文件类型 (jpg, png)
 * @param {string} base64Data - base64 文件内容
 */
export async function uploadFile(fileName, fileType, base64Data) {
  // 调用 BFF 的上传接口
  const response = await uni.request({
    url: `${BASE_URL}/api/merchant/upload`,
    method: 'POST',
    header: {
      'Content-Type': 'application/json'
    },
    data: {
      file_name: fileName,
      file_type: fileType,
      file_content: base64Data
    }
  })
  
  const res = response.data
  if (res.code !== 0) {
    throw new Error(res.message || '文件上传失败')
  }
  return res.data
}

/**
 * 提交商户开户申请
 * @param {object} params - 商户信息参数
 */
export async function submitMerchantApply(params) {
  // 调用 BFF 的申请接口
  const response = await uni.request({
    url: `${BASE_URL}/api/merchant/apply`,
    method: 'POST',
    header: {
      'Content-Type': 'application/json'
    },
    data: params
  })
  
  return response.data
}

/**
 * 查询商户状态
 * @param {number|string} merchantId - 商户ID
 */
export async function getMerchantStatus(merchantId) {
  const response = await uni.request({
    url: `${BASE_URL}/api/merchant/${merchantId}`,
    method: 'GET'
  })
  
  return response.data
}

/**
 * 获取商户列表
 */
export async function getMerchantList() {
  const response = await uni.request({
    url: `${BASE_URL}/api/merchant`,
    method: 'GET'
  })
  
  return response.data
}