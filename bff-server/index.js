require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { KJUR } = require('jsrsasign');
const fs = require('fs');
const path = require('path');
const { Base64 } = require('jsrsasign');
const crypto = require('crypto');
require('express-async-errors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- 钱账通配置 ---
const QZT_CONFIG = {
  appId: process.env.QZT_APP_ID || '7348882579718766592',
  version: '4.0',
  gateway: 'https://qztuat.xc-fintech.com/gateway/soa',
  privateKey: fs.readFileSync(path.join(__dirname, 'keys', 'private_key.pem'), 'utf8'),
  publicKey: fs.readFileSync(path.join(__dirname, 'keys', 'cloud_public_key.pem'), 'utf8')
};

// --- 商户数据库 ---
const MERCHANT_DB_FILE = path.join(__dirname, 'merchant.json');
if (!fs.existsSync(MERCHANT_DB_FILE)) {
  fs.writeFileSync(MERCHANT_DB_FILE, JSON.stringify([]));
}
function getMerchants() {
  return JSON.parse(fs.readFileSync(MERCHANT_DB_FILE, 'utf8'));
}
function saveMerchant(merchant) {
  const merchants = getMerchants();
  const idx = merchants.findIndex(m => m.id === merchant.id);
  if (idx >= 0) {
    merchants[idx] = { ...merchants[idx], ...merchant, updated_at: new Date().toISOString() };
  } else {
    merchant.id = Date.now();
    merchant.created_at = new Date().toISOString();
    merchant.updated_at = new Date().toISOString();
    merchants.unshift(merchant);
  }
  fs.writeFileSync(MERCHANT_DB_FILE, JSON.stringify(merchants, null, 2));
  return merchant;
}
function getMerchantById(id) {
  const merchants = getMerchants();
  return merchants.find(m => String(m.id) === String(id));
}

// --- 流水数据库（原有） ---
const DB_FILE = path.join(__dirname, 'database.json');
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([]));
}
function getFlows() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function saveFlow(flow) {
  const flows = getFlows();
  flow.id = Date.now();
  flow.created_at = new Date().toISOString();
  flows.unshift(flow);
  fs.writeFileSync(DB_FILE, JSON.stringify(flows, null, 2));
}

// --- 加签 / 验签工具 ---
function signData(content) {
  const sig = new KJUR.crypto.Signature({ alg: 'SHA256withRSA' });
  sig.init(QZT_CONFIG.privateKey);
  sig.updateString(content);
  return sig.sign();
}

function verifyData(data, signValue) {
  if (!signValue) return true;
  try {
    const sig = new KJUR.crypto.Signature({ alg: 'SHA256withRSA' });
    sig.init(QZT_CONFIG.publicKey);
    sig.updateString(data);
    return sig.verify(signValue);
  } catch(e) {
    return false;
  }
}

// --- 调用钱账通网关 ---
async function callQzt(service, params) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const paramsStr = JSON.stringify(params);
  const signContent = QZT_CONFIG.appId + timestamp + QZT_CONFIG.version + service + paramsStr;
  const signValue = signData(signContent);

  const body = {
    app_id: QZT_CONFIG.appId,
    timestamp,
    version: QZT_CONFIG.version,
    sign: signValue,
    service,
    params: paramsStr
  };

  const response = await axios.post(QZT_CONFIG.gateway, body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000
  });
  return response.data;
}

// --- 文件上传到钱账通 ---
async function uploadFileToQzt(fileName, fileType, fileBuffer) {
  const fileHash = crypto.createHash('md5').update(fileBuffer).digest('hex');
  const fileBase64 = fileBuffer.toString('base64');

  const params = {
    file_name: fileName,
    file_type: fileType,
    file_hash: fileHash
  };

  // 先调用接口获取 file_key
  const result = await callQzt('file.upload.commn', params);
  let parsed;
  if (typeof result.result === 'string') {
    parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
  } else {
    parsed = result.result;
  }

  // 把 file_content 添加到 params 中再次请求
  params.file_content = fileBase64;
  const uploadResult = await callQzt('file.upload.commn', params);

  let uploadParsed;
  if (typeof uploadResult.result === 'string') {
    uploadParsed = JSON.parse(Buffer.from(uploadResult.result, 'base64').toString('utf8'));
  } else {
    uploadParsed = uploadResult.result;
  }

  return uploadParsed; // { file_key: 'xxx' }
}

// ================= API: 商户入驻 =================

// 1. 上传证件照片到钱账通，返回 file_key
app.post('/api/merchant/upload', async (req, res) => {
  const { file_name, file_type, file_content } = req.body;
  if (!file_name || !file_type || !file_content) {
    return res.status(400).json({ code: 400, message: '缺少必要参数' });
  }

  try {
    const fileBuffer = Buffer.from(file_content, 'base64');
    const result = await uploadFileToQzt(file_name, file_type, fileBuffer);
    res.json({ code: 0, data: { file_key: result.file_key } });
  } catch (error) {
    console.error('文件上传失败:', error.response?.data || error.message);
    res.status(500).json({ code: 500, message: '文件上传失败', error: error.message });
  }
});

// 2. 提交商户开户申请
app.post('/api/merchant/apply', async (req, res) => {
  const {
    merchant_name,
    merchant_shortname,
    service_phone,
    business_license_type,
    business_license_no,
    business_license_province,
    business_license_city,
    business_license_address,
    business_address,
    legal_name,
    legal_id_card_no,
    legal_id_card_expire,
    legal_phone,
    bank_account_type,
    bank_name,
    bank_account_no,
    bank_account_name,
    bank_province,
    bank_city,
    bank_branch_name,
    bank_union_code,
    legal_id_card_front,
    legal_id_card_back,
    business_license_img,
    bank_account_permit
  } = req.body;

  // 参数校验
  const required = [
    'merchant_name', 'merchant_shortname', 'service_phone',
    'business_license_type', 'business_license_province', 'business_license_city',
    'business_license_address', 'business_address',
    'legal_name', 'legal_id_card_no', 'legal_id_card_expire', 'legal_phone',
    'bank_account_type', 'bank_name', 'bank_account_no', 'bank_account_name',
    'bank_province', 'bank_city', 'bank_branch_name', 'bank_union_code',
    'legal_id_card_front', 'legal_id_card_back', 'business_license_img'
  ];
  for (const field of required) {
    if (!req.body[field]) {
      return res.status(400).json({ code: 400, message: `缺少必填字段: ${field}` });
    }
  }

  const outRequestNo = String(Date.now());

  const params = {
    out_request_no: outRequestNo,
    merchant_name,
    merchant_shortname,
    service_phone,
    business_license_type: parseInt(business_license_type),
    business_license_province,
    business_license_city,
    business_license_address,
    business_address,
    legal_name,
    legal_id_card_no,
    legal_id_card_expire,
    legal_phone,
    bank_account_type,
    bank_name,
    bank_account_no,
    bank_account_name,
    bank_province,
    bank_city,
    bank_branch_name,
    bank_union_code,
    legal_id_card_front,
    legal_id_card_back,
    business_license_img
  };

  if (business_license_type == 2 && !business_license_no) {
    return res.status(400).json({ code: 400, message: '普通营业执照必填营业执照号' });
  }
  if (business_license_type == 2) params.business_license_no = business_license_no;
  if (bank_account_type == '2') params.bank_account_permit = bank_account_permit;

  try {
    const result = await callQzt('open.pay.account.apply', params);

    // 解析返回的 result（钱账通返回 base64 加密的内容）
    let parsed;
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = result.result;
      }
    } else {
      parsed = result;
    }

    if (result.status === 'FAIL') {
      return res.status(400).json({ code: 400, message: result.message || '开户申请失败', error_code: result.error_code });
    }

    // 保存商户信息到本地数据库
    const merchant = saveMerchant({
      out_request_no: outRequestNo,
      merchant_name,
      merchant_shortname,
      service_phone,
      business_license_type,
      business_license_no,
      business_license_province,
      business_license_city,
      business_license_address,
      business_address,
      legal_name,
      legal_id_card_no,
      legal_id_card_expire,
      legal_phone,
      bank_account_type,
      bank_name,
      bank_account_no,
      bank_account_name,
      bank_province,
      bank_city,
      bank_branch_name,
      bank_union_code,
      status: 'PENDING',  // 待审核/跳转H5
      qzt_response: parsed
    });

    // 返回 H5 开户地址给前端
    res.json({
      code: 0,
      data: {
        merchant_id: merchant.id,
        out_request_no: outRequestNo,
        h5_url: parsed.url || parsed.content?.url,
        token: parsed.token || parsed.content?.token,
        expire: parsed.expire || parsed.content?.expire
      }
    });

  } catch (error) {
    console.error('商户开户申请失败:', error.response?.data || error.message);
    res.status(500).json({ code: 500, message: '商户开户申请失败', error: error.message });
  }
});

// 3. 钱账通回调通知
app.post('/api/merchant/callback', async (req, res) => {
  try {
    const { status, result, sign } = req.body;

    console.log('收到钱账通开户回调:', JSON.stringify(req.body));

    // TODO: 验签（如果有 sign 的话）
    // if (sign && !verifyData(result, sign)) {
    //   return res.status(400).send('FAIL');
    // }

    let parsed;
    try {
      parsed = JSON.parse(Buffer.from(result, 'base64').toString('utf8'));
    } catch(e) {
      parsed = typeof result === 'string' ? JSON.parse(result) : result;
    }

    const { out_request_no, status: qztStatus, merchant_no, message } = parsed;

    // 更新本地商户状态
    const merchants = getMerchants();
    const merchant = merchants.find(m => m.out_request_no === out_request_no);
    if (merchant) {
      merchant.status = qztStatus === 'SUCCESS' ? 'ACTIVE' : 'FAILED';
      merchant.qzt_merchant_no = merchant_no;
      merchant.callback_message = message;
      merchant.callback_at = new Date().toISOString();
      saveMerchant(merchant);
      console.log(`✔ 商户状态更新: ${out_request_no} -> ${merchant.status}`);
    }

    res.send('SUCCESS');
  } catch (error) {
    console.error('处理钱账通回调失败:', error);
    res.status(500).send('FAIL');
  }
});

// 4. 查询商户状态
app.get('/api/merchant/:id', (req, res) => {
  const merchant = getMerchantById(req.params.id);
  if (!merchant) {
    return res.status(404).json({ code: 404, message: '商户不存在' });
  }
  res.json({ code: 0, data: merchant });
});

// 5. 获取商户列表
app.get('/api/merchant', (req, res) => {
  const merchants = getMerchants();
  res.json({ code: 0, data: merchants });
});

// ================= API: 代理钱账通接口（原有） =================
app.post('/api/qzt/proxy', async (req, res) => {
  const { service, params } = req.body;
  if (!service) return res.status(400).json({ error: 'Missing service name' });

  const result = await callQzt(service, params || {});
  res.json(result);
});

// ================= API: 门店绑定 (示例) =================
app.post('/api/merchant/bind', async (req, res) => {
  const { merchant_no } = req.body;
  res.json({ code: 0, message: '绑定模拟成功', merchant_no });
});

// ================= WEBHOOK: 接收交易流水通知 =================
app.post('/webhook/trade-flow', (req, res) => {
  const payload = req.body;
  try {
    const data = JSON.parse(payload.result || '{}');
    const dbData = {
      merchant_no: data.merchant_no,
      order_no: data.order_no,
      trade_type: data.trade_type,
      amount: data.amount,
      status: data.status,
      raw_data: JSON.stringify(data)
    };
    saveFlow(dbData);
    console.log('✔ 已记录一笔真实交易流水:', data.order_no);
    res.send('SUCCESS');
  } catch (e) {
    res.status(400).send('FAIL');
  }
});

// ================= API: 前端获取交易流水记录 (展示用) =================
app.get('/api/flows', (req, res) => {
  try {
    const rows = getFlows();
    res.json({ code: 0, data: rows });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// 统一错误捕获
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`[BFF Server] 钱账通真实对接服务已启动运行在 http://localhost:${port}`);
});
