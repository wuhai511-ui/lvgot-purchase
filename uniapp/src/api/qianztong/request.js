import axios from 'axios'
import QZT_CONFIG from '@/config/qianztong.js'

export async function qztRequest(service, params = {}) {
  try {
    const response = await axios.post(QZT_CONFIG.gateway, {
      service,
      params
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    })

    const res = response.data

    if (res.status === 'FAIL') {
      const err = new Error(res.message || '钱账通接口调用失败')
      err.code = res.error_code
      throw err
    }

    return res.result
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.error || '接口请求异常')
    }
    throw error
  }
}

export async function qztFileUpload(fileName, fileType, fileHash, fileContentBase64, extraParams = {}) {
  const params = { file_name: fileName, file_type: fileType, file_hash: fileHash, ...extraParams }
  return await qztRequest('file.upload.commn', params)
}
