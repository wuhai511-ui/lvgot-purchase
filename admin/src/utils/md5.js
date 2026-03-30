/**
 * MD5 工具（用于钱账通文件 hash 计算）
 * 使用 js-md5 库
 */
import md5 from 'js-md5'

/**
 * 计算字符串的 MD5
 * @param {string} str
 * @returns {string} 32位十六进制小写
 */
export const md5String = (str) => md5(str)

/**
 * 计算 ArrayBuffer 的 MD5
 * @param {ArrayBuffer} buffer
 * @returns {string} 32位十六进制小写
 */
export const md5ArrayBuffer = (buffer) => {
  const word = md5.ArrayBuffer(buffer)
  // md5.js ArrayBuffer returns WordArray, convert to hex
  return word.toString()
}

export { md5 }
