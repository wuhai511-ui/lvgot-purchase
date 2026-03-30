/**
 * RSA 工具（使用 jsrsasign）
 * 支持：RSA-SHA1 签名、PKCS1padding、RSA 加密
 */
import { KJUR } from 'jsrsasign'

/**
 * RSA-SHA1 签名（PKCS1Padding）
 * @param {string} data      签名原文
 * @param {string} pemKey   PEM 格式私钥
 * @returns {string} base64 签名
 */
export const sign = (data, pemKey) => {
  const sig = new KJUR.kclass.Signature({ alg: 'SHA1withRSA', prov: 'cryptojs' })
  sig.init(pemKey)
  sig.updateString(data)
  return sig.sign()
}

/**
 * RSA 验签
 * @param {string} pemKey   PEM 格式公钥
 * @param {string} data     原文
 * @param {string} signStr  base64 签名
 * @returns {boolean}
 */
export const verify = (pemKey, data, signStr) => {
  try {
    const sig = new KJUR.kclass.Signature({ alg: 'SHA1withRSA', prov: 'cryptojs' })
    sig.init(pemKey)
    sig.updateString(data)
    return sig.verify(signStr)
  } catch {
    return false
  }
}

/**
 * RSA 加密（PKCS1Padding）
 * @param {string} data   待加密字符串
 * @param {string} pemKey PEM 格式公钥
 * @returns {string} base64 密文
 */
export const encrypt = (data, pemKey) => {
  return KJUR.kclass.encr.rsa.encrypt(data, pemKey, '2') // 2 = PKCS1Padding
}

/**
 * RSA 解密
 * @param {string} data   base64 密文
 * @param {string} pemKey PEM 格式私钥
 * @returns {string} 明文
 */
export const decrypt = (data, pemKey) => {
  return KJUR.kclass.encr.rsa.decrypt(data, pemKey, '2')
}
