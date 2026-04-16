/**
 * 钱账通（QZT）服务层
 * 统一封装签名、验签、接口调用
 * 签名算法：RSA + SHA256 (Node.js crypto)
 */
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const QZT_CONFIG = {
  appId: process.env.QZT_APP_ID || '',
  version: '4.0',
  gateway: process.env.QZT_GATEWAY_URL || 'https://test.wsmsd.cn/qzt/gateway/soa',
  privateKey: fs.readFileSync(process.env.QZT_PRIVATE_KEY_PATH || path.join(__dirname, '..', 'keys', 'private_key.pem'), 'utf8'),
  publicKey: fs.readFileSync(process.env.QZT_PUBLIC_KEY_PATH || path.join(__dirname, '..', 'keys', 'cloud_public_key.pem'), 'utf8'),
};

const { appId, version, gateway, privateKey, publicKey } = QZT_CONFIG;

// 签名
function signData(content) {
  const signer = crypto.createSign('SHA256');
  signer.update(content);
  return signer.sign(privateKey, 'base64');
}

// 验签
function verifyData(data, signValue) {
  const verifier = crypto.createVerify('SHA256');
  verifier.update(data);
  return verifier.verify(publicKey, signValue, 'base64');
}

/**
 * 调用钱账通接口
 * @param {string} service - 服务名，如 'terminal.bind'
 * @param {object} params - 业务参数
 * @returns {Promise<object>} - QZT 返回的 result 字段
 */
async function callQzt(service, params = {}) {
  const timestamp = String(Math.floor(Date.now() / 1000));

  // file_content 不参与签名
  let paramsForSign = params;
  let paramsStr = JSON.stringify(params);
  if (params.file_content !== undefined) {
    paramsForSign = { ...params };
    delete paramsForSign.file_content;
    paramsStr = JSON.stringify(paramsForSign);
  }

  const signContent = appId + timestamp + version + service + paramsStr;
  const signValue = signData(signContent);

  const body = {
    app_id: appId,
    timestamp,
    version,
    sign: signValue,
    service,
    params: paramsForSign,
  };
  if (params.file_content !== undefined) {
    body.file_content = params.file_content;
  }

  const response = await axios.post(gateway, body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  }).catch(err => {
    console.error('[callQzt] 请求失败:', err.message, '| service:', service);
    throw err;
  });

  const { status, result, error_code, message, sign: responseSign } = response.data;

  // 验签
  if (status === 'SUCCESS' && responseSign) {
    const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
    const valid = verifyData(resultStr, responseSign);
    if (!valid) throw new Error('QZT response signature verify failed');
  }

  if (status === 'FAIL') {
    const err = new Error(`${error_code}: ${message}`);
    err.code = error_code;
    throw err;
  }

  return result;
}

/**
 * 验证通知事件签名（Webhook 场景）
 * @param {string} eventStr - event 字段的 JSON 字符串
 * @param {string} signValue - 签名
 * @returns {boolean}
 */
function verifyEvent(eventStr, signValue) {
  return verifyData(eventStr, signValue);
}

/**
 * 解析 QZT 返回的 result（可能是 base64 字符串或对象）
 * @param {string|object} result
 * @returns {object}
 */
function parseResult(result) {
  if (typeof result === 'string') {
    try {
      return JSON.parse(Buffer.from(result, 'base64').toString('utf8'));
    } catch {
      return JSON.parse(result);
    }
  }
  return result;
}

module.exports = {
  callQzt,
  verifyEvent,
  parseResult,
  QZT_CONFIG,
};