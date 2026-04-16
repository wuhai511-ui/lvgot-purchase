/**
 * 统一请求封装
 * 开发环境使用本地 Mock JSON
 * 生产环境可切换到真实 API
 */

const BASE_URL = 'http://localhost:3001'
const MOCK_DELAY = 300 // ms，模拟网络延迟

// Mock 数据缓存
const mockCache = {}

// 模拟请求
function mockRequest(url, method = 'GET', data = {}) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const mockData = require(`@/mock/data${url}.json`)
        resolve({ data: mockData, statusCode: 200 })
      } catch (e) {
        reject({ errMsg: `Mock 数据不存在: ${url}`, statusCode: 404 })
      }
    }, MOCK_DELAY)
  })
}

// 实际请求
function request({ url, method = 'GET', data }) {
  // #ifdef MP-WEIXIN
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + url,
      method,
      data,
      success: (res) => resolve(res),
      fail: (err) => reject(err),
    })
  })
  // #endif

  // #ifdef H5
  return fetch(url, { method, body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } })
    .then(r => r.json())
  // #endif
}

export default { request, mockRequest }
