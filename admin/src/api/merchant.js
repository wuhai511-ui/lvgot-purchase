/**
 * 商户相关 API
 */
import { get, post, upload } from './request.js'

/**
 * 手机号+验证码登录
 * @param {string} phone 手机号
 * @param {string} code 验证码
 */
export const merchantLogin = (phone, code) => {
  return post('/api/merchant/login', { phone, code })
}

/**
 * 文件上传（通用）
 * @param {File} file 文件对象
 * @returns {Promise<string>} file_key
 */
export const uploadFile = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  // Mock: 返回模拟 file_key
  return new Promise((resolve) => {
    setTimeout(() => resolve('file_key_' + Date.now()), 800)
  })
  // 真实实现：
  // return upload('/api/file/upload', formData).then(r => r.data.file_key)
}

/**
 * 商户开户申请
 * @param {Object} data 开户表单数据
 */
export const openAccount = (data) => {
  // Mock: 返回模拟跳转URL
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        code: 0,
        message: '提交成功',
        data: {
          redirectUrl: 'https://qzt.example.com/h5/account/open?merchantId=mock_' + Date.now(),
          accountNo: 'LAK' + Date.now()
        }
      })
    }, 2000)
  })
  // 真实实现：
  // return post('/api/open/account/apply', data)
}

/**
 * 查询商户开户状态
 * @param {string} merchantId
 */
export const getMerchantStatus = (merchantId) => {
  return get('/api/merchant/status', { merchantId })
}
