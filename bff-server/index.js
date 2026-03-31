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

// --- RSA 加密工具（用于敏感字段如银行卡号）---
function rsaEncrypt(plaintext) {
  const encrypted = crypto.publicEncrypt(
    {
      key: QZT_CONFIG.publicKey,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    Buffer.from(plaintext)
  );
  return encrypted.toString('base64');
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
  const paramsStr = JSON.stringify(params);  const signContent = QZT_CONFIG.appId + timestamp + QZT_CONFIG.version + service + paramsStr;
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

// ================= API: 商户入驻（支持 /api/merchant 和 /api/v1/merchants 双路径） =================

const merchantRouter = express.Router();

// 1. 上传证件照片到钱账通，返回 file_key
merchantRouter.post('/upload', async (req, res) => {
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
merchantRouter.post('/apply', async (req, res) => {
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
      status: 'PENDING',
      qzt_response: parsed
    });

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

// 4. 查询商户状态
merchantRouter.get('/:id', (req, res) => {
  const merchant = getMerchantById(req.params.id);
  if (!merchant) {
    return res.status(404).json({ code: 404, message: '商户不存在' });
  }
  res.json({ code: 0, data: merchant });
});

// 5. 获取商户列表
merchantRouter.get('/', (req, res) => {
  const merchants = getMerchants();
  res.json({ code: 0, data: merchants });
});

// 同时挂载到 /api/merchant 和 /api/v1/merchants
app.use('/api/merchant', merchantRouter);
app.use('/api/v1/merchants', merchantRouter);

// 3. 钱账通回调通知（独立路径，不纳入 merchantRouter）
app.post('/api/merchant/callback', async (req, res) => {
  try {
    const { status, result, sign } = req.body;
    console.log('收到钱账通开户回调:', JSON.stringify(req.body));
    let parsed;
    try {
      parsed = JSON.parse(Buffer.from(result, 'base64').toString('utf8'));
    } catch(e) {
      parsed = typeof result === 'string' ? JSON.parse(result) : result;
    }
    const { out_request_no, status: qztStatus, merchant_no, message } = parsed;
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

// ================= API: 钱账通事件回调 =================
/**
 * POST /api/qzt/event/callback
 * 接收钱账通事件通知，按 event_type 分发处理
 */
app.post('/api/qzt/event/callback', async (req, res) => {
  try {
    console.log('收到钱账通事件回调:', JSON.stringify(req.body));

    // 事件回调统一结构：{ event_type, event_id, event_time, sign, result }
    // result 可能是 base64 字符串
    const { event_type, result: rawResult } = req.body;
    let event;

    if (rawResult) {
      try {
        event = JSON.parse(Buffer.from(rawResult, 'base64').toString('utf8'));
      } catch(e) {
        event = typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult;
      }
    } else {
      event = req.body;
    }

    switch (event_type) {
      case 'open.split.account':
        await handleSplitAccountEvent(event);
        break;
      default:
        console.log(`[EVENT] 未知事件类型: ${event_type}，跳过处理`);
    }

    res.send('SUCCESS');
  } catch (error) {
    console.error('处理钱账通事件回调失败:', error);
    res.status(500).send('FAIL');
  }
});

/**
 * 处理分账方开户通知事件
 * open.split.account
 */
async function handleSplitAccountEvent(event) {
  const {
    out_request_no,
    account_no,
    register_name,
    open_state,
    esign_list,
    bank_list,
    error_message,
    complete_time
  } = event;

  console.log(`[EVENT] open.split.account — out_request_no=${out_request_no}, account_no=${account_no}, open_state=${open_state}`);

  const merchants = getMerchants();

  // 用 out_request_no 匹配商户（分账方开户也使用平台传入的 out_request_no）
  let merchant = merchants.find(m => m.out_request_no === out_request_no);

  // 如果没找到，尝试用 account_no 匹配（钱账通侧也有记录）
  if (!merchant) {
    merchant = merchants.find(m => m.account_no === account_no);
  }

  // 如果还没找到，创建一个新记录（被动开户场景）
  if (!merchant) {
    merchant = {
      id: Date.now(),
      out_request_no,
      account_no,
      created_at: new Date().toISOString()
    };
    console.log(`[EVENT] 未找到对应商户，为分账方创建新记录: ${out_request_no}`);
  }

  // 根据 open_state 更新商户状态
  // 00:创建 / 01:已开通 / 02:已关闭 / 03:审核中
  let targetStatus = merchant.status;
  switch (open_state) {
    case '01':
      targetStatus = 'ACTIVE';
      break;
    case '03':
      targetStatus = 'PENDING';
      break;
    case '02':
      targetStatus = 'CLOSED';
      break;
    default:
      targetStatus = 'CREATED'; // 00 创建中
  }

  merchant.out_request_no = out_request_no || merchant.out_request_no;
  merchant.account_no = account_no || merchant.account_no;
  merchant.register_name = register_name || merchant.register_name;
  merchant.open_state = open_state;
  merchant.status = targetStatus;
  merchant.esign_list = esign_list || [];
  merchant.bank_list = bank_list || [];
  merchant.error_message = error_message || '';
  merchant.complete_time = complete_time || '';
  merchant.event_callback_at = new Date().toISOString();

  saveMerchant(merchant);
  console.log(`[EVENT] 分账方状态更新: out_request_no=${out_request_no} -> open_state=${open_state}, status=${targetStatus}`);
}

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
      raw_data: JSON.stringify(data)    };
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

// =============================================================================
// 新增路由：Task 1-A ~ 1-F
// =============================================================================

// ----------------- Task 1-A: 移动端 OCR 识别 -----------------
/**
 * POST /api/merchant/ocr
 * 支持身份证正面/背面、营业执照识别
 * 如果 file_key 为空，则先通过 file.upload.commn 上传文件
 */
app.post('/api/merchant/ocr', async (req, res) => {
  try {
    const { file_key, type, file_name, file_type, file_content } = req.body;

    if (!file_key && !file_content) {
      return res.status(400).json({ code: 400, message: '缺少 file_key 或 file_content' });
    }

    if (!file_key && file_content) {
      // 没有 file_key，先上传文件获取 file_key
      const fileBuffer = Buffer.from(file_content, 'base64');
      const uploadResult = await uploadFileToQzt(
        file_name || `ocr_${type}_${Date.now()}.jpg`,
        file_type || 'jpg',
        fileBuffer
      );
      // eslint-disable-next-line no-param-reassign
      req.body.file_key = uploadResult.file_key;
    }

    const { file_key: targetFileKey } = req.body;

    // 调用钱账通 OCR 识别
    // 注意：bff-server callQzt 把 params 序列化为字符串，和 qzt-client.js 的 doRequest 签名逻辑一致
    const result = await callQzt('ocr.recognize', {
      file_key: targetFileKey,
      file_type: type === 'license' ? 'license' : 'idcard',
      // ocr.recognize 是否需要 file_content 取决于钱账通接口定义
      // 这里先用 file_key 方式调用，等 service name 确认后补充
    });

    // 钱账通返回结构: { status, result, sign }，result 可能是 base64 字符串
    let parsed = result;
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : result.result;
      }
    }

    // 根据 type 返回对应字段
    if (type === 'front' || type === 'back') {
      // 身份证识别结果
      res.json({
        code: 0,
        data: {
          name: parsed.name || parsed.idcard_name || '',
          id_card_no: parsed.id_card_no || parsed.idcard_no || '',
          id_card_address: parsed.address || parsed.id_card_address || '',
          id_card_birth: parsed.birth || parsed.id_card_birth || '',
          id_card_sex: parsed.sex || parsed.id_card_sex || '',
        }
      });
    } else if (type === 'license') {
      // 营业执照识别结果
      res.json({
        code: 0,
        data: {
          biz_license_credit_code: parsed.biz_license_credit_code || parsed.credit_code || '',
          biz_license_name: parsed.name || parsed.biz_license_name || '',
          biz_license_address: parsed.address || parsed.biz_license_address || '',
          biz_license_scope: parsed.scope || parsed.biz_license_scope || '',
        }
      });
    } else {
      res.status(400).json({ code: 400, message: 'type 必须是 front、back 或 license' });
    }
  } catch (error) {
    console.error('OCR 识别失败:', error.response?.data || error.message);
    res.status(500).json({ code: 500, message: 'OCR 识别失败', error: error.message });
  }
});

// ----------------- Task 1-B: PC端个人角色开户（分账方开户 H5 页面模式）-----------------
/**
 * POST /api/merchant/apply-personal
 * 说明：推荐使用 open.split.account.page.url (6.3) 获取 H5 页面 URL，
 *      前端跳转到钱账通 H5 完成开户资料填写 + 人脸识别，
 *      钱账通回调 open.split.account 事件通知开户结果。
 *      open.split.account.apply (6.9) 作为补充直接申请（不走 H5）。
 *
 * service: open.split.account.page.url (6.3)
 * 参数: out_request_no, register_name, legal_mobile, enterprise_type, back_url
 * 响应: { url, account_no }
 */
app.post('/api/merchant/apply-personal', async (req, res) => {
  try {
    const {
      out_request_no,
      register_name,   // 注册名称（商户姓名）
      legal_mobile,    // 法人手机号
      enterprise_type, // 1=企业 / 2=个体工商户 / 3=个人
      back_url,       // 开户完成后跳转 URL
      // 以下为扩展字段，记录到 merchant.json
      name,
      id_card_no,
      id_card_front,
      id_card_back,
      bank_account_no,
      bank_account_name,
      bank_name,
      bank_province,
      bank_city,
      bank_branch_name,
      role_type
    } = req.body;

    if (!out_request_no || !register_name || !legal_mobile || !enterprise_type) {
      return res.status(400).json({ code: 400, message: '缺少必填字段: out_request_no, register_name, legal_mobile, enterprise_type' });
    }

    const result = await callQzt('open.split.account.page.url', {
      out_request_no,
      register_name,
      legal_mobile,
      enterprise_type: parseInt(enterprise_type),
      back_url: back_url || ''
    });

    // 解析响应（result 可能是 base64 字符串）
    let parsed = { url: '', account_no: '' };
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || parsed);
      }
    }

    // 保存到 merchant.json，status=PENDING（H5 填写中人脸识别待完成）
    const merchant = saveMerchant({
      out_request_no,
      register_name,
      legal_mobile,
      enterprise_type,
      back_url,
      name,
      id_card_no,
      id_card_front,
      id_card_back,
      bank_account_no,
      bank_account_name,
      bank_name,
      bank_province,
      bank_city,
      bank_branch_name,
      role_type,
      status: 'PERSONAL_PENDING',
      qzt_response: parsed
    });

    res.json({
      code: 0,
      data: {
        merchant_id: merchant.id,
        account_no: parsed.account_no || '',
        h5_url: parsed.url || '',
        out_request_no
      }
    });
  } catch (error) {
    console.error('个人开户申请失败:', error.response?.data || error.message);
    res.status(500).json({ code: 500, message: '个人开户申请失败', error: error.message });
  }
});

// ================= Task 1-C: 分账方开户完整流程（6.3 / 6.9 / 6.10 / 6.11） =================

/**
 * POST /api/merchant/split-account-page  — [6.3] 获取分账方开户 H5 页面 URL
 * service: open.split.account.page.url
 * 用途：前端跳转钱账通 H5 填写资料 + 人脸识别
 */
app.post('/api/merchant/split-account-page', async (req, res) => {
  try {
    const { out_request_no, register_name, legal_mobile, enterprise_type, back_url } = req.body;
    const required = ['out_request_no', 'register_name', 'legal_mobile', 'enterprise_type'];
    for (const f of required) {
      if (!req.body[f]) return res.status(400).json({ code: 400, message: `缺少必填参数: ${f}` });
    }

    const result = await callQzt('open.split.account.page.url', {
      out_request_no,
      register_name,
      legal_mobile,
      enterprise_type: parseInt(enterprise_type),
      back_url: back_url || ''
    });

    let parsed = { url: '', account_no: '' };
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || parsed);
      }
    }

    res.json({ code: 0, data: { url: parsed.url, account_no: parsed.account_no } });
  } catch (error) {
    console.error('[6.3] 获取分账方开户页面失败:', error.message);
    res.status(500).json({ code: 500, message: '获取开户页面失败', error: error.message });
  }
});

/**
 * POST /api/merchant/split-account-apply  — [6.9] 分账方开户申请（直接申请，补充模式）
 * service: open.split.account.apply
 * 说明：非 H5 模式，直接提交资料开户；适用于补充材料等场景
 */
app.post('/api/merchant/split-account-apply', async (req, res) => {
  try {
    const {
      out_request_no, register_name, mobile,
      enterprise_type, name, id_no,
      id_front, id_back,
      bank_type, bank_card_no, bank_card_name,
      bank_branch, bank_province, bank_city, bank_area,
      back_url
    } = req.body;

    const required = ['out_request_no', 'register_name', 'mobile', 'enterprise_type', 'name', 'id_no', 'id_front', 'id_back', 'bank_type', 'bank_card_no', 'bank_card_name', 'bank_branch', 'bank_province', 'bank_city', 'bank_area'];
    for (const f of required) {
      if (!req.body[f]) return res.status(400).json({ code: 400, message: `缺少必填参数: ${f}` });
    }

    const result = await callQzt('open.split.account.apply', {
      out_request_no,
      register_name,
      mobile,
      enterprise_type: parseInt(enterprise_type),
      name,
      id_no,
      id_front,
      id_back,
      bank_type,
      bank_card_no, // 敏感字段，建议 RSA 加密后传入
      bank_card_name,
      bank_branch,
      bank_province,
      bank_city,
      bank_area,
      back_url: back_url || ''
    });

    let parsed = { status: '' };
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || parsed);
      }
    }

    // status: 00=申请受理 / 01=开户成功 / 02=开户失败 / 03=电子签约
    const merchant = saveMerchant({
      out_request_no,
      register_name,
      mobile,
      enterprise_type,
      name,
      id_no,
      status: parsed.status === '01' ? 'ACTIVE' : parsed.status === '02' ? 'FAILED' : 'PERSONAL_PENDING',
      qzt_response: parsed
    });

    res.json({ code: 0, data: { merchant_id: merchant.id, status: parsed.status, qzt_response: parsed } });
  } catch (error) {
    console.error('[6.9] 分账方开户申请失败:', error.message);
    res.status(500).json({ code: 500, message: '分账方开户申请失败', error: error.message });
  }
});

/**
 * POST /api/merchant/split-account-affirm  — [6.10] 开户申请确认（电签完成后确认）
 * service: open.split.account.apply.affirm
 * 参数: out_request_no 或 account_no 二选一 + agreement_id（协议ID）必填
 * status: 01=开户成功 / 02=开户失败 / 04=审核中
 */
app.post('/api/merchant/split-account-affirm', async (req, res) => {
  try {
    const { out_request_no, account_no, agreement_id } = req.body;
    if (!agreement_id) return res.status(400).json({ code: 400, message: '缺少必填参数: agreement_id' });
    if (!out_request_no && !account_no) return res.status(400).json({ code: 400, message: 'out_request_no 或 account_no 二选一必填' });

    const params = { agreement_id };
    if (out_request_no) params.out_request_no = out_request_no;
    if (account_no) params.account_no = account_no;

    const result = await callQzt('open.split.account.apply.affirm', params);

    let parsed = { status: '' };
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || parsed);
      }
    }

    // 更新商户状态
    const targetStatus = parsed.status === '01' ? 'ACTIVE' : parsed.status === '04' ? 'PENDING' : 'FAILED';
    const merchants = getMerchants();
    const merchant = merchants.find(m => m.out_request_no === out_request_no || m.account_no === account_no);
    if (merchant) {
      merchant.status = targetStatus;
      saveMerchant(merchant);
    }

    res.json({ code: 0, data: { status: parsed.status, message: parsed.message || '' } });
  } catch (error) {
    console.error('[6.10] 开户确认失败:', error.message);
    res.status(500).json({ code: 500, message: '开户确认失败', error: error.message });
  }
});

/**
 * POST /api/merchant/split-account-agreement-replenish  — [6.11] 协议补充
 * service: open.split.account.agreement.replenish
 * 参数同 confirm，agreement_id 必填
 */
app.post('/api/merchant/split-account-agreement-replenish', async (req, res) => {
  try {
    const { out_request_no, account_no, agreement_id } = req.body;
    if (!agreement_id) return res.status(400).json({ code: 400, message: '缺少必填参数: agreement_id' });
    if (!out_request_no && !account_no) return res.status(400).json({ code: 400, message: 'out_request_no 或 account_no 二选一必填' });

    const params = { agreement_id };
    if (out_request_no) params.out_request_no = out_request_no;
    if (account_no) params.account_no = account_no;

    const result = await callQzt('open.split.account.agreement.replenish', params);

    let parsed = { status: '' };
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || parsed);
      }
    }

    res.json({ code: 0, data: { status: parsed.status, message: parsed.message || '' } });
  } catch (error) {
    console.error('[6.11] 协议补充失败:', error.message);
    res.status(500).json({ code: 500, message: '协议补充失败', error: error.message });
  }
});

// ================= 兼容层：旧版前端代理路由（方案 A）====================
// 前端调用旧路由，BFF 适配后转发到真实 service

/**
 * POST /api/qzt/split/pre-order  — 兼容旧版前端（分流账开户申请 → open.split.account.page.url）
 * 旧格式: { account_no, amount, split_detail }
 * 新格式: → open.split.account.page.url
 */
app.post('/api/qzt/split/pre-order', async (req, res) => {
  try {
    const { account_no, amount, split_detail } = req.body;
    if (!account_no || !amount) return res.status(400).json({ code: 400, message: '缺少 account_no, amount' });

    // 旧 pre-order 本质上是走 H5 页面开户，这里转发到 6.3 page.url 模式
    const outRequestNo = `OLD${Date.now()}`;
    const result = await callQzt('open.split.account.page.url', {
      out_request_no: outRequestNo,
      register_name: req.body.name || req.body.register_name || '',
      legal_mobile: req.body.mobile || req.body.legal_mobile || '',
      enterprise_type: parseInt(req.body.enterprise_type || 3), // 3=个人
      back_url: ''
    });

    let parsed = { url: '', account_no: '' };
    if (result.result) {
      try { parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8')); }
      catch(e) { parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || parsed); }
    }

    res.json({ code: 0, data: { split_order_no: outRequestNo, h5_url: parsed.url || '', account_no: parsed.account_no || account_no } });
  } catch (error) {
    console.error('[兼容] split/pre-order 失败:', error.message);
    res.status(500).json({ code: 500, message: '分账预下单失败', error: error.message });
  }
});

/**
 * POST /api/qzt/split/confirm  — 兼容旧版前端（开户确认 → open.split.account.apply.affirm）
 * 旧格式: { split_order_no }
 * 新格式: → open.split.account.apply.affirm { agreement_id: split_order_no }
 */
app.post('/api/qzt/split/confirm', async (req, res) => {
  try {
    const { split_order_no } = req.body;
    if (!split_order_no) return res.status(400).json({ code: 400, message: '缺少 split_order_no' });

    // 旧 confirm 用 split_order_no 充当 agreement_id
    const result = await callQzt('open.split.account.apply.affirm', {
      out_request_no: split_order_no,
      agreement_id: split_order_no
    });

    let parsed = { status: '' };
    if (result.result) {
      try { parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8')); }
      catch(e) { parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || parsed); }
    }

    res.json({ code: 0, data: { status: parsed.status === '01' ? 'SUCCESS' : 'FAILED' } });
  } catch (error) {
    console.error('[兼容] split/confirm 失败:', error.message);
    res.status(500).json({ code: 500, message: '分账确认失败', error: error.message });
  }
});

// ================= Task 1-C: 分账交易接口（7.1 / 7.2）====================

/**
 * POST /api/qzt/split/apply  — [7.1] 交易余额分账
 * service: trans.trade.fund.split
 * 金额单位：分（fen），前端传元，BFF 转为分发给钱账通
 */
app.post('/api/qzt/split/apply', async (req, res) => {
  try {
    const {
      out_request_no, account_no,
      split_amount,   // 单位：元，前端传入
      split_list,     // [{ account_no, bank_account_no?, amount, remark }]
      withdraw_type,   // D0 / D1 / T1，可选
      back_url
    } = req.body;

    if (!out_request_no || !account_no || !split_amount || !split_list) {
      return res.status(400).json({ code: 400, message: '缺少必填参数: out_request_no, account_no, split_amount, split_list' });
    }

    // 元 → 分
    const splitAmountFen = Math.round(parseFloat(split_amount) * 100);
    const splitListFen = split_list.map(item => ({
      account_no: item.account_no,
      bank_account_no: item.bank_account_no || '',
      amount: Math.round(parseFloat(item.amount) * 100),
      remark: item.remark || ''
    }));

    const result = await callQzt('trans.trade.fund.split', {
      out_request_no,
      account_no,
      split_type: '01', // 固定余额分账
      split_amount: splitAmountFen,
      split_list: splitListFen,
      back_url: back_url || ''
    });

    let parsed = { split_seq_no: `SP${Date.now()}`, split_state: '00', accept_time: '' };
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || parsed);
      }
    }

    res.json({
      code: 0,
      data: {
        split_seq_no: parsed.split_seq_no,
        split_state: parsed.split_state, // 00=受理/01=失败
        accept_time: parsed.accept_time || new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[7.1] 分账申请失败:', error.message);
    res.status(500).json({ code: 500, message: '分账申请失败', error: error.message });
  }
});

/**
 * GET /api/qzt/split/query  — [7.2] 分账查询
 * service: trans.trade.fund.split.query
 * 参数: split_seq_no 或 out_request_no 二选一
 */
app.get('/api/qzt/split/query', async (req, res) => {
  try {
    const { split_seq_no, out_request_no } = req.query;
    if (!split_seq_no && !out_request_no) {
      return res.status(400).json({ code: 400, message: 'split_seq_no 或 out_request_no 二选一必填' });
    }

    const params = {};
    if (split_seq_no) params.split_seq_no = split_seq_no;
    if (out_request_no) params.out_request_no = out_request_no;

    const result = await callQzt('trans.trade.fund.split.query', params);

    let parsed = { split_state: '' };
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || parsed);
      }
    }

    // split_state: 00=受理/01=失败/02=成功/03=部分成功/04=处理中
    res.json({ code: 0, data: parsed });
  } catch (error) {
    console.error('[7.2] 分账查询失败:', error.message);
    res.status(500).json({ code: 500, message: '分账查询失败', error: error.message });
  }
});

// ================= Task 1-D: 钱账通提现接口（7.3 / 7.4 / 7.5 / 7.6）====================

/**
 * POST /api/qzt/withdraw/pre-order  — [7.3] 提现申请（预下单 + 发送短信，两步合一）
 * service: account.balance.withdraw
 * 金额单位：分（fen），前端传元，BFF 转为分
 * 流程：调 7.3 获取 withdraw_seq_no → 调 7.5 发短信 → 直接返回 sms_sent=true
 */
app.post('/api/qzt/withdraw/pre-order', async (req, res) => {
  try {
    const {
      out_request_no, account_no, bank_account_no,
      amount,   // 单位：元
      withdraw_type, // D0 / D1 / T1
      withdraw_postscript,
      back_url
    } = req.body;

    const required = ['out_request_no', 'account_no', 'bank_account_no', 'amount'];
    for (const field of required) {
      if (!req.body[field]) return res.status(400).json({ code: 400, message: `缺少必填参数: ${field}` });
    }

    // 元 → 分
    const withdrawAmountFen = Math.round(parseFloat(amount) * 100);

    // Step 1: 调用 7.3 提现申请
    const withdrawResult = await callQzt('account.balance.withdraw', {
      out_request_no,
      account_no,
      bank_account_no,
      withdraw_amount: withdrawAmountFen,
      withdraw_type: withdraw_type || 'T1',
      withdraw_postscript: withdraw_postscript || '',
      back_url: back_url || ''
    });

    let withdrawParsed = { withdraw_seq_no: '', withdraw_state: '', fee_amount: '0', received_amount: '0', accept_time: '' };
    if (withdrawResult.result) {
      try {
        withdrawParsed = JSON.parse(Buffer.from(withdrawResult.result, 'base64').toString('utf8'));
      } catch(e) {
        withdrawParsed = typeof withdrawResult.result === 'string' ? JSON.parse(withdrawResult.result) : (withdrawResult.result || withdrawParsed);
      }
    }

    // Step 2: 调 7.5 发送短信验证码
    let smsSent = false;
    try {
      await callQzt('account.balance.withdraw.sms.send', {
        out_request_no,
        account_no,
        withdraw_seq_no: withdrawParsed.withdraw_seq_no
      });
      smsSent = true;
    } catch(smsErr) {
      console.warn('[7.5] 发送提现短信失败（不影响提现流程）:', smsErr.message);
    }

    // 分 → 元
    const feeAmountYuan = (parseInt(withdrawParsed.fee_amount || 0) / 100).toFixed(2);
    const receivedAmountYuan = (parseInt(withdrawParsed.received_amount || 0) / 100).toFixed(2);

    res.json({
      code: 0,
      data: {
        withdraw_seq_no: withdrawParsed.withdraw_seq_no,
        withdraw_state: withdrawParsed.withdraw_state,
        fee_amount: parseFloat(feeAmountYuan),
        received_amount: parseFloat(receivedAmountYuan),
        sms_sent: smsSent,
        accept_time: withdrawParsed.accept_time || new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[7.3] 提现预下单失败:', error.message);
    res.status(500).json({ code: 500, message: '提现预下单失败', error: error.message });
  }
});

/**
 * POST /api/qzt/withdraw/confirm  — [7.6] 提现确认（填入短信验证码）
 * service: account.balance.withdraw.confirm
 */
app.post('/api/qzt/withdraw/confirm', async (req, res) => {
  try {
    const { out_request_no, account_no, withdraw_seq_no, sms_code } = req.body;
    if (!sms_code) return res.status(400).json({ code: 400, message: '缺少必填参数: sms_code' });
    if (!withdraw_seq_no && !out_request_no) return res.status(400).json({ code: 400, message: 'withdraw_seq_no 或 out_request_no 二选一必填' });

    const params = { sms_code };
    if (withdraw_seq_no) params.withdraw_seq_no = withdraw_seq_no;
    if (out_request_no) params.out_request_no = out_request_no;
    if (account_no) params.account_no = account_no;

    const result = await callQzt('account.balance.withdraw.confirm', params);

    let parsed = { withdraw_state: '', fee_amount: '0', received_amount: '0' };
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || parsed);
      }
    }

    const feeAmountYuan = (parseInt(parsed.fee_amount || 0) / 100).toFixed(2);
    const receivedAmountYuan = (parseInt(parsed.received_amount || 0) / 100).toFixed(2);

    res.json({
      code: 0,
      data: {
        withdraw_state: parsed.withdraw_state,
        fee_amount: parseFloat(feeAmountYuan),
        received_amount: parseFloat(receivedAmountYuan),
        message: parsed.message || ''
      }
    });
  } catch (error) {
    console.error('[7.6] 提现确认失败:', error.message);
    res.status(500).json({ code: 500, message: '提现确认失败', error: error.message });
  }
});

/**
 * GET /api/qzt/withdraw/query  — [7.4] 提现查询
 * service: account.balance.withdraw.query
 */
app.get('/api/qzt/withdraw/query', async (req, res) => {
  try {
    const { withdraw_seq_no, out_request_no } = req.query;
    if (!withdraw_seq_no && !out_request_no) {
      return res.status(400).json({ code: 400, message: 'withdraw_seq_no 或 out_request_no 二选一必填' });
    }

    const params = {};
    if (withdraw_seq_no) params.withdraw_seq_no = withdraw_seq_no;
    if (out_request_no) params.out_request_no = out_request_no;

    const result = await callQzt('account.balance.withdraw.query', params);

    let parsed = { withdraw_state: '', fee_amount: '0', received_amount: '0' };
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || parsed);
      }
    }

    const feeAmountYuan = (parseInt(parsed.fee_amount || 0) / 100).toFixed(2);
    const receivedAmountYuan = (parseInt(parsed.received_amount || 0) / 100).toFixed(2);

    res.json({
      code: 0,
      data: {
        withdraw_state: parsed.withdraw_state,
        fee_amount: parseFloat(feeAmountYuan),
        received_amount: parseFloat(receivedAmountYuan),
        message: parsed.message || ''
      }
    });
  } catch (error) {
    console.error('[7.4] 提现查询失败:', error.message);
    res.status(500).json({ code: 500, message: '提现查询失败', error: error.message });
  }
});

/**
 * POST /api/qzt/withdraw/apply  — 兼容旧版前端，确认提现
 * 旧版 apply = 确认提现（填短信验证码），转发到 account.balance.withdraw.confirm (7.6)
 * 旧格式: { withdraw_order_no, sms_code }
 */
app.post('/api/qzt/withdraw/apply', async (req, res) => {
  try {
    const { withdraw_order_no, sms_code } = req.body;
    if (!sms_code) return res.status(400).json({ code: 400, message: '缺少必填参数: sms_code' });

    const result = await callQzt('account.balance.withdraw.confirm', {
      withdraw_seq_no: withdraw_order_no || '',
      sms_code
    });

    let parsed = { withdraw_state: '', fee_amount: '0', received_amount: '0' };
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || parsed);
      }
    }

    const feeAmountYuan = (parseInt(parsed.fee_amount || 0) / 100).toFixed(2);
    const receivedAmountYuan = (parseInt(parsed.received_amount || 0) / 100).toFixed(2);
    res.json({ code: 0, data: { withdraw_state: parsed.withdraw_state, fee_amount: parseFloat(feeAmountYuan), received_amount: parseFloat(receivedAmountYuan), message: parsed.message || '' } });
  } catch (error) {
    console.error('[兼容] withdraw/apply 失败:', error.message);
    res.status(500).json({ code: 500, message: '提现确认失败', error: error.message });
  }
});

// ================= Task 1-E: 钱账通充值预下单（金额单位：分）====================
/**
 * POST /api/qzt/recharge/pre-order
 * service: account.recharge.apply
 * 金额单位：分（fen）
 */
app.post('/api/qzt/recharge/pre-order', async (req, res) => {
  try {
    const { account_no, amount, recharge_desc } = req.body;
    if (!account_no || !amount) return res.status(400).json({ code: 400, message: '缺少必填参数: account_no, amount' });
    const amountFen = Math.round(parseFloat(amount) * 100);
    if (amountFen <= 0) return res.status(400).json({ code: 400, message: '充值金额必须大于 0' });

    const outRequestNo = `CZ${Date.now()}`;
    const result = await callQzt('account.recharge.apply', {
      out_request_no: outRequestNo,
      account_no,
      recharge_amt: amountFen,
      recharge_desc: recharge_desc || '',
      back_url: ''
    });

    let parsed = {};
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || {});
      }
    }

    // 分 → 元
    const amountYuan = parsed.recharge_amt ? (parseInt(parsed.recharge_amt) / 100).toFixed(2) : amount;
    const feeAmountYuan = parsed.fee_amount ? (parseInt(parsed.fee_amount) / 100).toFixed(2) : '0.00';
    const receivedYuan = parsed.received_amount ? (parseInt(parsed.received_amount) / 100).toFixed(2) : amount;

    res.json({
      code: 0,
      data: {
        recharge_seq_no: parsed.recharge_seq_no || '',
        order_no: parsed.recharge_order_no || outRequestNo, // recharge_order_no 用于转账备注
        amount: parseFloat(amountYuan),
        recharge_state: parsed.recharge_state || '00', // 00=待转账/01=失败/02=成功/03=处理中
        payee_acc_no: parsed.payee_acc_no || '',
        payee_acc_name: parsed.payee_acc_name || '拉卡拉支付股份有限公司',
        payee_bank: parsed.payee_bank || '',
        payee_bank_name: parsed.payee_bank_name || '拉卡拉-备付金账户',
        payee_bank_area: parsed.payee_bank_area || '北京',
        fee_amount: parseFloat(feeAmountYuan),
        received_amount: parseFloat(receivedYuan),
        accept_time: parsed.accept_time || '',
        remark: '请使用同名账户转账，务必在转账备注中填写充值订单号'
      }
    });
  } catch (error) {
    console.error('[7.9] 充值预下单失败:', error.message);
    res.status(500).json({ code: 500, message: '充值预下单失败', error: error.message });
  }
});

// ================= Task 1-G: 余额查询（7.7）====================
/**
 * GET /api/merchant/:id/balance  — [7.7] 账户余额查询
 * service: account.balance.query
 * 金额单位：钱账通返回分，BFF 转为元返回前端
 */
app.get('/api/merchant/:id/balance', async (req, res) => {
  try {
    const merchant = getMerchantById(req.params.id);
    if (!merchant) return res.status(404).json({ code: 404, message: '商户不存在' });

    const accountNo = req.query.account_no || merchant.account_no;
    if (!accountNo) return res.status(400).json({ code: 400, message: 'account_no 未找到，请先开户' });

    const result = await callQzt('account.balance.query', { account_no: accountNo });

    let parsed = { available_amount: '0', trans_amount: '0' };
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || parsed);
      }
    }

    // 分 → 元
    const availableYuan = (parseInt(parsed.available_amount || 0) / 100).toFixed(2);
    const transAmountYuan = (parseInt(parsed.trans_amount || 0) / 100).toFixed(2);

    res.json({
      code: 0,
      data: {
        account_no: accountNo,
        available_amount: parseFloat(availableYuan),  // 可用资金（元）
        trans_amount: parseFloat(transAmountYuan)     // 待结算资金（元）
      }
    });
  } catch (error) {
    console.error('[7.7] 余额查询失败:', error.message);
    res.status(500).json({ code: 500, message: '余额查询失败', error: error.message });
  }
});

// ================= Task 1-F + 1-G: 移动端人脸识别 + 账户流水 + 充值查询 =================

/**
 * GET /api/merchant/:id/flow  — [7.8] 账户流水查询
 * service: account.flow.query
 * 参数: start_date(yyyyMMdd), end_date(yyyyMMdd,不能超过30天), page, page_size, sort
 * 金额单位: 钱账通返回分，BFF 转为元
 */
app.get('/api/merchant/:id/flow', async (req, res) => {
  try {
    const merchant = getMerchantById(req.params.id);
    if (!merchant) return res.status(404).json({ code: 404, message: '商户不存在' });

    const { start_date, end_date, page, page_size, sort } = req.query;
    if (!start_date || !end_date || !page || !page_size) {
      return res.status(400).json({ code: 400, message: '缺少必填参数: start_date, end_date, page, page_size' });
    }

    const accountNo = req.query.account_no || merchant.account_no;
    if (!accountNo) return res.status(400).json({ code: 400, message: 'account_no 未找到，请先开户' });

    const params = {
      account_no: accountNo,
      start_date,
      end_date,
      page: parseInt(page),
      page_size: Math.min(parseInt(page_size), 30),
      sort: sort || 'desc'
    };

    const result = await callQzt('account.flow.query', params);

    let parsed = { total: '0', records: [] };
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || parsed);
      }
    }

    // 分 → 元
    const records = (parsed.records || []).map(r => ({
      flow_no: r.flow_no || '',
      amount: parseFloat(((parseInt(r.chg_amount || 0)) / 100).toFixed(2)),
      cur_amount: parseFloat(((parseInt(r.cur_amount || 0)) / 100).toFixed(2)),
      ori_amount: parseFloat(((parseInt(r.ori_amount || 0)) / 100).toFixed(2)),
      loan_flag: r.loan_flag || '',     // IN=转入，OUT=转出
      chg_time: r.chg_time || '',       // yyyyMMddHHmmss
      chg_type: r.chg_type || '',       // DEPOSIT/TRANSFER
      chg_sub_type: r.chg_sub_type || '', // CONSUME/DISTRIBUTE/REFUND/SETTLE/RETURN/ADJUST
      busi_desc: r.busi_desc || ''
    }));

    res.json({ code: 0, data: { total: parsed.total || 0, records } });
  } catch (error) {
    console.error('[7.8] 账户流水查询失败:', error.message);
    res.status(500).json({ code: 500, message: '账户流水查询失败', error: error.message });
  }
});

/**
 * GET /api/qzt/recharge/status  — [7.10] 充值状态查询
 * service: account.recharge.query
 * 参数: recharge_seq_no 或 out_request_no 二选一
 */
app.get('/api/qzt/recharge/status', async (req, res) => {
  try {
    const { recharge_seq_no, out_request_no } = req.query;
    if (!recharge_seq_no && !out_request_no) {
      return res.status(400).json({ code: 400, message: 'recharge_seq_no 或 out_request_no 二选一必填' });
    }

    const params = {};
    if (recharge_seq_no) params.recharge_seq_no = recharge_seq_no;
    if (out_request_no) params.out_request_no = out_request_no;

    const result = await callQzt('account.recharge.query', params);

    let parsed = { recharge_state: '' };
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || parsed);
      }
    }

    const amountYuan = parsed.recharge_amt ? (parseInt(parsed.recharge_amt) / 100).toFixed(2) : '0';
    const feeYuan = parsed.fee_amount ? (parseInt(parsed.fee_amount) / 100).toFixed(2) : '0';
    const receivedYuan = parsed.received_amount ? (parseInt(parsed.received_amount) / 100).toFixed(2) : '0';

    res.json({
      code: 0,
      data: {
        recharge_seq_no: parsed.recharge_seq_no || recharge_seq_no || '',
        order_no: parsed.recharge_order_no || '',
        recharge_state: parsed.recharge_state || '',
        amount: parseFloat(amountYuan),
        fee_amount: parseFloat(feeYuan),
        received_amount: parseFloat(receivedYuan),
        accept_time: parsed.accept_time || '',
        complete_time: parsed.complete_time || ''
      }
    });
  } catch (error) {
    console.error('[7.10] 充值状态查询失败:', error.message);
    res.status(500).json({ code: 500, message: '充值状态查询失败', error: error.message });
  }
});

// ================= Task 1-F: 移动端获取人脸识别链接 =================
/**
 * GET /api/merchant/:id/face-recognition-url
 * service: open.account.person.auth.url
 * 商户完成人脸识别后可解除限额（从1000元提升）
 */
app.get('/api/merchant/:id/face-recognition-url', async (req, res) => {
  try {
    const merchant = getMerchantById(req.params.id);
    if (!merchant) return res.status(404).json({ code: 404, message: '商户不存在' });

    if (merchant.status === 'VERIFIED') {
      return res.json({ code: 0, data: { already_verified: true } });
    }

    // TODO: service name 待钱账通确认后替换为真实 service
    // 预期 service: open.account.person.auth.url（或类似）
    // const result = await callQzt('open.account.person.auth.url', {
    //   account_no: merchant.account_no || '',
    //   merchant_id: merchant.qzt_merchant_no || merchant.id
    // });

    const outRequestNo = merchant.out_request_no || `FACE${merchant.id}`;
    const mockH5Url = `https://qztuat.xc-fintech.com/h5/face-recognition?out_request_no=${outRequestNo}&app_id=${QZT_CONFIG.appId}`;

    res.json({ code: 0, data: { h5_url: mockH5Url, out_request_no: outRequestNo } });
  } catch (error) {
    console.error('获取人脸识别链接失败:', error.message);
    res.status(500).json({ code: 500, message: '获取人脸识别链接失败', error: error.message });
  }
});

// ================= 新增 8 个接口：商终查询/绑定/解绑 + 银行卡绑定/解绑 =================

/**
 * GET /api/merchant/terminals  — [6.8] 商终查询
 * service: trans.merchant.query
 * 参数: account_no(可选), page(必填), page_size(必填)
 */
app.get('/api/merchant/terminals', async (req, res) => {
  try {
    const { account_no, page, page_size } = req.query;
    if (!page || !page_size) return res.status(400).json({ code: 400, message: '缺少必填参数: page, page_size' });

    const params = { page: parseInt(page), page_size: parseInt(page_size) };
    if (account_no) params.account_no = account_no;

    const result = await callQzt('trans.merchant.query', params);

    let parsed = { total_num: 0, mers: [] };
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || parsed);
      }
    }

    res.json({ code: 0, data: { total_num: parsed.total_num || 0, mers: parsed.mers || [] } });
  } catch (error) {
    console.error('[6.8] 商终查询失败:', error.message);
    res.status(500).json({ code: 500, message: '商终查询失败', error: error.message });
  }
});

/**
 * POST /api/qzt/merchant/bind  — [6.4] 商终绑定
 * service: trans.merchant.bind
 * 参数: account_no, channel_merchant_no, channel_term_no, device_type(POS/TRANS_PAY), term_type(SCAN/BANK/OTHER)
 * 响应: { bind_state: '00'=成功/'01'=关闭 }
 */
app.post('/api/qzt/merchant/bind', async (req, res) => {
  try {
    const { account_no, channel_merchant_no, channel_term_no, device_type, term_type } = req.body;
    const required = ['account_no', 'channel_merchant_no', 'channel_term_no', 'device_type', 'term_type'];
    for (const f of required) {
      if (!req.body[f]) return res.status(400).json({ code: 400, message: `缺少必填参数: ${f}` });
    }

    const result = await callQzt('trans.merchant.bind', {
      account_no, channel_merchant_no, channel_term_no, device_type, term_type
    });

    let parsed = { bind_state: '' };
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || parsed);
      }
    }

    res.json({ code: 0, data: { bind_state: parsed.bind_state, message: parsed.message || '' } });
  } catch (error) {
    console.error('[6.4] 商终绑定失败:', error.message);
    res.status(500).json({ code: 500, message: '商终绑定失败', error: error.message });
  }
});

/**
 * POST /api/qzt/merchant/unbind  — [6.5] 商终解绑
 * service: trans.merchant.unbind
 * 参数: account_no, merchant_no
 * 响应: { bind_state: '02'=解绑 }
 */
app.post('/api/qzt/merchant/unbind', async (req, res) => {
  try {
    const { account_no, merchant_no } = req.body;
    if (!account_no || !merchant_no) return res.status(400).json({ code: 400, message: '缺少必填参数: account_no, merchant_no' });

    const result = await callQzt('trans.merchant.unbind', { account_no, merchant_no });

    let parsed = { bind_state: '' };
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || parsed);
      }
    }

    res.json({ code: 0, data: { bind_state: parsed.bind_state, message: parsed.message || '' } });
  } catch (error) {
    console.error('[6.5] 商终解绑失败:', error.message);
    res.status(500).json({ code: 500, message: '商终解绑失败', error: error.message });
  }
});

/**
 * POST /api/qzt/bank-card/bind  — [6.6] 绑定银行卡
 * service: account.bank.card.bind
 * 参数: account_no, bank_type, bank_code, bank_card_no(RSA加密), bank_card_name,
 *       bank_branch, bank_province, bank_city, bank_area, open_agreement(file_key)
 * 响应: { bank_account_no, bind_state: '00'=成功/'01'=失败 }
 */
app.post('/api/qzt/bank-card/bind', async (req, res) => {
  try {
    const {
      account_no, bank_type, bank_code, bank_card_no, bank_card_name,
      bank_branch, bank_province, bank_city, bank_area, open_agreement
    } = req.body;

    const required = ['account_no', 'bank_type', 'bank_code', 'bank_card_no', 'bank_card_name',
      'bank_branch', 'bank_province', 'bank_city', 'bank_area'];
    for (const f of required) {
      if (!req.body[f]) return res.status(400).json({ code: 400, message: `缺少必填参数: ${f}` });
    }

    // bank_card_no 敏感字段，使用 RSA 加密（复用 qzt-client 的加密逻辑）
    const encryptedCardNo = rsaEncrypt(bank_card_no);

    const result = await callQzt('account.bank.card.bind', {
      account_no, bank_type, bank_code,
      bank_card_no: encryptedCardNo,
      bank_card_name, bank_branch,
      bank_province, bank_city, bank_area,
      open_agreement: open_agreement || ''
    });

    let parsed = { bank_account_no: '', bind_state: '' };
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || parsed);
      }
    }

    res.json({ code: 0, data: { bank_account_no: parsed.bank_account_no, bind_state: parsed.bind_state } });
  } catch (error) {
    console.error('[6.6] 绑定银行卡失败:', error.message);
    res.status(500).json({ code: 500, message: '绑定银行卡失败', error: error.message });
  }
});

/**
 * POST /api/qzt/bank-card/unbind  — [6.7] 解绑银行卡
 * service: account.bank.card.unbind
 * 参数: account_no, bank_account_no
 * 响应: { bind_state: '10'=解绑成功/'11'=解绑失败 }
 */
app.post('/api/qzt/bank-card/unbind', async (req, res) => {
  try {
    const { account_no, bank_account_no } = req.body;
    if (!account_no || !bank_account_no) return res.status(400).json({ code: 400, message: '缺少必填参数: account_no, bank_account_no' });

    const result = await callQzt('account.bank.card.unbind', { account_no, bank_account_no });

    let parsed = { bind_state: '' };
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || parsed);
      }
    }

    res.json({ code: 0, data: { bind_state: parsed.bind_state, message: parsed.message || '' } });
  } catch (error) {
    console.error('[6.7] 解绑银行卡失败:', error.message);
    res.status(500).json({ code: 500, message: '解绑银行卡失败', error: error.message });
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
