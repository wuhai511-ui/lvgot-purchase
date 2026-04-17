/**
 * 钱账通·文件服务
 * 文档：Chapter 5.1 - 5.2
 */
import request from '@/utils/request.js'

/**
 * 文件上传（身份证、营业执照等）
 * @param {string} fileName - 文件名（例：id_card_front.jpg）
 * @param {string} fileType - 文件类型：pdf / jpg / png
 * @param {string} fileHash - MD5 哈希（小写）
 * @param {string} fileContent - Base64 编码文件内容
 * @returns {Promise<{file_no: string}>}
 */
export async function upload(fileName, fileType, fileHash, fileContent) {
  return request.post('/api/qzt/proxy', { service: 'file.upload.commn', params: {
    file_name: fileName,
    file_type: fileType,
    file_hash: fileHash,
    file_content: fileContent,
  } })
}

/**
 * 文件下载
 * @param {string} fileNo - 上传返回的文件标识
 * @returns {Promise<{file_type, file_name, file_content}>}
 */
export async function download(fileNo) {
  return request.post('/api/qzt/proxy', { service: 'file.download.commn', params: { file_no: fileNo } })
}
