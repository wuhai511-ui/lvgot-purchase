/**
 * 基础请求封装 - 基于 Fetch API
 * 所有请求指向 BFF 地址
 */

// BFF 地址：前后端部署在同一服务器，使用相对路径
const BASE_URL = ''

/**
 * 通用请求函数
 * @param {Object} config - 请求配置
 * @param {string} config.url - 请求路径
 * @param {string} [config.method='GET'] - 请求方法
 * @param {Object} [config.params] - URL 查询参数（用于 GET 请求）
 * @param {Object} [config.data] - 请求体数据（用于 POST/PUT 等）
 * @param {Object} [config.headers] - 额外请求头
 * @param {number} [config.timeout=10000] - 超时时间(ms)
 */
export function request(config) {
  const {
    url,
    method = 'GET',
    params,
    data,
    headers = {},
    timeout = 10000,
  } = config

  // 拼接 URL 和参数
  let fullUrl = url
  if (params && Object.keys(params).length > 0) {
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
    ).toString()
    fullUrl = `${url}?${queryString}`
  }

  // 从 localStorage 获取 token
  const token = localStorage.getItem('token') || ''

  // 构建请求头
  const requestHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  }

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`
  }

  // 构建请求配置
  const requestConfig = {
    method,
    headers: requestHeaders,
  }

  // 添加 body（GET/HEAD 请求不添加 body）
  if (data && !['GET', 'HEAD'].includes(method.toUpperCase())) {
    if (data instanceof FormData) {
      // FormData 不设置 Content-Type，让浏览器自动设置
      delete requestHeaders['Content-Type']
      requestConfig.body = data
    } else {
      requestConfig.body = JSON.stringify(data)
    }
  }

  // 超时控制
  const controller = new AbortController()
  requestConfig.signal = controller.signal

  const timeoutId = setTimeout(() => controller.abort(), timeout)

  return fetch(`${BASE_URL}${fullUrl}`, requestConfig)
    .then((res) => {
      clearTimeout(timeoutId)
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`)
      }
      return res.json()
    })
    .catch((err) => {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        throw new Error('Request timeout')
      }
      throw err
    })
}

/**
 * GET 请求
 */
export function get(url, params) {
  return request({ url, method: 'GET', params })
}

/**
 * POST 请求
 */
export function post(url, data) {
  return request({ url, method: 'POST', data })
}

/**
 * PUT 请求
 */
export function put(url, data) {
  return request({ url, method: 'PUT', data })
}

/**
 * DELETE 请求
 */
export function del(url, params) {
  return request({ url, method: 'DELETE', params })
}

/**
 * 文件上传
 * @param {string} url - 上传路径
 * @param {FormData} formData - 表单数据
 */
export function upload(url, formData) {
  return request({
    url,
    method: 'POST',
    data: formData,
    headers: {}, // 让 request 处理 FormData，不设置 Content-Type
  })
}
