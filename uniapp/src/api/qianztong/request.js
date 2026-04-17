import request from '@/utils/request.js'
import QZT_CONFIG from '@/config/qianztong.js'

export async function qztRequest(service, params = {}) {
  // 不再直调钱账通网关，走BFF代理层
  return request.post('/api/qzt/proxy', {
    service,
    params
  })
}

export async function qztFileUpload(fileName, fileType, fileHash, fileContentBase64, extraParams = {}) {
  // 文件上传如果也有BFF的接口可以提出来，或者继续走 qztRequest /api/qzt/proxy 但带上内容
  const params = { file_name: fileName, file_type: fileType, file_hash: fileHash, file_content: fileContentBase64, ...extraParams }
  return await qztRequest('file.upload.commn', params)
}
