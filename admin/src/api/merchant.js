/**
 * 商户模块 API
 */
import { get, post, upload } from './request.js'

/**
 * 商户登录（手机号+验证码）
 * @param {string} phone - 手机号
 * @param {string} code - 验证码
 */
export function merchantLogin(phone, code) {
  return Promise.resolve({
    code: 0,
    message: 'success',
    data: {
      token: 'mock_jwt_token_' + Date.now(),
      merchantId: 'M0001',
      merchantName: '测试商户',
    },
  })
}

/**
 * 商户登录（用户名+密码）
 * @param {string} username - 用户名
 * @param {string} password - 密码
 */
export function login(username, password) {
  return Promise.resolve({
    code: 0,
    message: 'success',
    data: {
      token: 'mock_token_' + Date.now(),
      merchantId: 'M0001',
      merchantName: '测试商户',
    },
  })
}

/**
 * 申请商户账号
 * @param {Object} data - 申请数据
 */
export function applyAccount(data) {
  return Promise.resolve({
    code: 0,
    message: 'success',
    data: {
      applyId: 'A' + Date.now(),
      status: 'pending',
    },
  })
}

/**
 * 文件上传
 * @param {FormData} formData - 文件表单数据
 */
export function uploadFile(formData) {
  return Promise.resolve({
    code: 0,
    message: 'success',
    data: {
      fileUrl: 'https://bgualqb.cn/files/' + Date.now(),
      fileId: 'F' + Date.now(),
    },
  })
}
