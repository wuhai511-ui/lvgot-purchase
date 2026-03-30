/**
 * 钱账通 RSA 签名封装
 * 预留，后续接入钱账通真实签名接口
 */

/**
 * 使用钱账通公钥对数据进行 RSA 签名
 * @param {object|string} data - 待签名数据
 * @returns {Promise<string>} - 签名后的字符串（当前为 Mock，返回原数据）
 */
export async function sign(data) {
  // TODO: 接入钱账通真实签名逻辑
  // 1. 加载钱账通提供的 RSA 公钥
  // 2. 对 data 进行 JSON.stringify + 排序
  // 3. 使用公钥加密并返回签名

  // Mock: 直接返回原数据
  if (typeof data === 'object') {
    return JSON.stringify(data);
  }
  return String(data);
}
