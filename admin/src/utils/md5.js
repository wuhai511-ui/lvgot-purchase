/**
 * MD5 工具（使用 js-md5）
 */
import md5 from 'js-md5'

/**
 * 计算字符串的 MD5
 * @param {string} str
 * @returns {string} 32位十六进制小写
 */
export const md5String = (str) => md5(str)

/**
 * 计算 ArrayBuffer 的 MD5，返回 hex 字符串
 * @param {ArrayBuffer} buffer
 * @returns {string} 32位十六进制小写
 */
export const md5ArrayBuffer = (buffer) => {
  // js-md5 的 ArrayBuffer 支持
  return md5(buffer)
}
