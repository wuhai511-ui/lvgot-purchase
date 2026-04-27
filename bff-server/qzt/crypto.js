/**
 * QZT 密钥与加密模块
 */
require('dotenv').config({ path: '/opt/lvgot-purchase/bff-server/.env' });

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 钱账通配置（延迟初始化，确保 dotenv 已加载）
let _QZT_CONFIG = null;
function getQztConfig() {
  console.log('[getQztConfig] QZT_APP_ID:', process.env.QZT_APP_ID);
  if (!_QZT_CONFIG) {
    _QZT_CONFIG = {
      appId: process.env.QZT_APP_ID || '',
      version: '4.0',
      gateway: process.env.QZT_GATEWAY_URL || 'https://test.wsmsd.cn/qzt/gateway/soa',
      privateKey: fs.readFileSync(process.env.QZT_PRIVATE_KEY_PATH || path.join(__dirname, '..', 'keys', 'private_key.pem'), 'utf8'),
      publicKey: fs.readFileSync(process.env.QZT_PUBLIC_KEY_PATH || path.join(__dirname, '..', 'keys', 'cloud_public_key.pem'), 'utf8')
    };
    // 密钥指纹日志
    const keyHash = crypto.createHash('md5').update(_QZT_CONFIG.privateKey).digest('hex');
    console.log('[QZT] private_key.md5:', keyHash);
    const pubHash = crypto.createHash('md5').update(_QZT_CONFIG.publicKey).digest('hex');
    console.log('[QZT] public_key.md5:', pubHash);
  }
  return _QZT_CONFIG;
}

// 兼容旧代码的常量访问
const QZT_CONFIG = new Proxy({}, {
  get(target, prop) {
    return getQztConfig()[prop];
  }
});

// QZT 回调地址
const QZT_CALLBACK_URL = process.env.QZT_CALLBACK_URL || 'http://localhost:3000';

/**
 * RSA 加密（使用 Node.js crypto）
 */
function rsaEncrypt(plaintext) {
  if (!plaintext) return '';
  try {
    const encrypted = crypto.publicEncrypt(
      {
        key: QZT_CONFIG.publicKey,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      Buffer.from(plaintext)
    );
    return encrypted.toString('base64');
  } catch (e) {
    console.error('[rsaEncrypt] 加密失败:', e.message);
    return '';
  }
}

/**
 * 签名（SHA256withRSA）
 */
function signData(content) {
  const signer = crypto.createSign('SHA256');
  signer.update(content, 'utf8');
  signer.end();
  return signer.sign(QZT_CONFIG.privateKey, 'base64');
}

/**
 * 验签（SHA256withRSA）
 */
function verifyData(data, signValue) {
  if (!signValue) return true;
  try {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(data, 'utf8');
    verifier.end();
    return verifier.verify(QZT_CONFIG.publicKey, signValue, 'base64');
  } catch(e) {
    console.error('[verifyData] 验签失败:', e.message);
    return false;
  }
}

module.exports = {
  QZT_CONFIG,
  QZT_CALLBACK_URL,
  getQztConfig,
  rsaEncrypt,
  signData,
  verifyData,
};
