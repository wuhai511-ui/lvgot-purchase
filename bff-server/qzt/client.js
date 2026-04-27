/**
 * QZT HTTP 客户端
 */
const axios = require('axios');
const { QZT_CONFIG, signData } = require('./crypto');

/**
 * 调用钱账通接口
 */
async function callQzt(service, params) {
  const timestamp = String(Math.floor(Date.now() / 1000));

  // file_content 不参与签名
  let paramsForSign = params;
  let paramsStr = JSON.stringify(params);
  if (params.file_content !== undefined) {
    paramsForSign = { ...params };
    delete paramsForSign.file_content;
    paramsStr = JSON.stringify(paramsForSign);
  }

  // 签名内容：appId + timestamp + version + service + paramsStr
  const signContent = QZT_CONFIG.appId + timestamp + QZT_CONFIG.version + service + paramsStr;
  const signValue = signData(signContent);

  const body = {
    app_id: QZT_CONFIG.appId,
    timestamp,
    version: QZT_CONFIG.version,
    sign: signValue,
    service,
    params: paramsForSign
  };

  // file_content 单独添加
  if (params.file_content !== undefined) {
    body.file_content = params.file_content;
  }

  try {
    console.log('[callQzt] 请求:', service, JSON.stringify({ ...body, params: '[params]' }));
    const response = await axios.post(QZT_CONFIG.gateway, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    console.log('[callQzt] 响应:', service, JSON.stringify(response.data));
    return response.data;
  } catch (err) {
    console.error('[callQzt] 请求失败:', err.message, '| service:', service);
    throw err;
  }
}

/**
 * 解析 QZT result 字段（Base64 → JSON）
 */
function parseQztResult(result) {
  if (!result) return {};
  if (typeof result === 'object') return result;
  try {
    return JSON.parse(Buffer.from(result, 'base64').toString('utf8'));
  } catch {
    try { return JSON.parse(result); } catch { return {}; }
  }
}

/**
 * 货币单位转换：分 → 元
 */
const toYuan = v => v == null ? 0 : parseFloat((parseInt(v) / 100).toFixed(2));

/**
 * 银行卡号脱敏
 */
function maskCardNo(cardNo) {
  if (!cardNo || cardNo.length < 8) return cardNo || '';
  return cardNo.substring(0, 4) + '****' + cardNo.substring(cardNo.length - 4);
}

/**
 * 银行编码 → 名称
 */
function getBankName(code) {
  const map = {
    '01020000': '中国工商银行', '01030000': '中国农业银行',
    '01040000': '中国银行', '01050000': '中国建设银行',
    '03080000': '招商银行', '03030000': '光大银行',
    '03020000': '中信银行', '03050000': '民生银行',
    '03060000': '广发银行', '03070000': '平安银行',
    '03100000': '浦发银行', '03090000': '兴业银行',
    '04012900': '北京银行', '04031000': '上海银行',
    '04083300': '宁波银行'
  };
  return map[code] || code;
}

let _seqCounter = 0;
function generateTransNo() {
  _seqCounter = (_seqCounter + 1) % 10000;
  var seq = String(_seqCounter).padStart(4, '0');
  return 'lvg' + Date.now() + seq;
}

module.exports = {
  callQzt,
  parseQztResult,
  toYuan,
  maskCardNo,
  getBankName,
  generateTransNo,
};
