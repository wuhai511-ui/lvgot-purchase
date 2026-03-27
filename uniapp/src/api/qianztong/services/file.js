/**
 * 钱账通·文件服务
 * file.upload.commn / file.download.commn
 */
import { qztRequest } from '../request.js'

/**
 * 上传文件（身份证、营业执照等）
 * @param {string} fileName - 文件名
 * @param {string} fileType - 文件类型：pdf/jpg/png
 * @param {string} fileHash - 文件 MD5 哈希（ lowercase）
 * @param {string} fileContent - Base64 编码的文件内容
 * @param {object} extraParams - 额外参数
 * @returns {Promise<{file_no: string}>}
 */
export async function upload(fileName, fileType, fileHash, fileContent, extraParams = {}) {
  return qztRequest('file.upload.commn', {
    file_name: fileName,
    file_type: fileType,
    file_hash: fileHash,
    file_content: fileContent,
    ...extraParams,
  })
}

/**
 * 下载文件
 * @param {string} fileNo - 上传返回的文件标识
 * @returns {Promise<{file_type, file_name, file_content}>}
 */
export async function download(fileNo) {
  return qztRequest('file.download.commn', { file_no: fileNo })
}
