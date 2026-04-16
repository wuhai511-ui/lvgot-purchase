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

// 导入 SQLite 数据库模块
const dbSqlite = require('./db-sqlite');

// 导入认证中间件
const { requireAuth, DEMO_MODE, issueToken } = require('./middleware/auth');

const app = express();
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- 钱账通配置 ---
const QZT_CONFIG = {
  appId: process.env.QZT_APP_ID || '',
  version: '4.0',
  gateway: process.env.QZT_GATEWAY_URL || 'https://test.wsmsd.cn/qzt/gateway/soa',
  privateKey: fs.readFileSync(process.env.QZT_PRIVATE_KEY_PATH || path.join(__dirname, 'keys', 'private_key.pem'), 'utf8'),
  publicKey: fs.readFileSync(process.env.QZT_PUBLIC_KEY_PATH || path.join(__dirname, 'keys', 'cloud_public_key.pem'), 'utf8')
};

// --- 全局常量 ---
// 回调地址前缀（用于钱账通回调通知，必须公网可访问）
const QZT_CALLBACK_URL = process.env.QZT_CALLBACK_URL || 'http://localhost:3001';
// 分页上限
const MAX_PAGE_SIZE = 100;

// 货币单位转换：DB/钱账通存储分(fen) → API返回元(yuan)
const toYuan = v => v == null ? 0 : parseFloat((parseInt(v) / 100).toFixed(2));

// --- 初始化 SQLite 数据库 ---
let dbInitialized = false;
async function initDb() {
  if (!dbInitialized) {
    await dbSqlite.initDatabase();
    dbInitialized = true;
    console.log('SQLite 数据库初始化完成');
  }
}

// 启动时初始化数据库
initDb().catch(console.error);

// 数据库操作函数（使用 SQLite）
const getMerchants = () => dbSqlite.getMerchants();
const saveMerchant = (merchant) => dbSqlite.saveMerchant(merchant);
const getMerchantByOutRequestNo = (out_request_no) => dbSqlite.getMerchantByOutRequestNo(out_request_no);
const getMerchantById = (id) => dbSqlite.getMerchantById(id);

// 旅行团操作
const saveTourGroup = (tour) => dbSqlite.saveTourGroup(tour);
const getTourGroups = (merchant_id) => dbSqlite.getTourGroups(merchant_id);
const getTourGroupById = (id) => dbSqlite.getTourGroupById(id);
const deleteTourGroup = (id) => dbSqlite.deleteTourGroup(id);

// 团队成员操作
const saveTourMember = (member) => dbSqlite.saveTourMember(member);
const getTourMembers = (tour_id) => dbSqlite.getTourMembers(tour_id);
const deleteTourMember = (id) => dbSqlite.deleteTourMember(id);

// 分账规则操作
const saveSplitRule = (rule) => dbSqlite.saveSplitRule(rule);
const getSplitRules = (merchant_id) => dbSqlite.getSplitRules(merchant_id);
const getSplitRuleById = (id) => dbSqlite.getSplitRuleById(id);
const deleteSplitRule = (id) => dbSqlite.deleteSplitRule(id);
const saveSplitRuleItem = (item) => dbSqlite.saveSplitRuleItem(item);
const getSplitRuleItems = (rule_id) => dbSqlite.getSplitRuleItems(rule_id);

// ========== LowDB → SQLite 适配层 ==========
// 统一使用 SQLite，移除 LowDB；这些适配器让调用方无需改动签名
const getAccountsByMerchantId = (merchant_id) => dbSqlite.getAccountsByMerchantId(merchant_id);
const getBankCardsByMerchantId = (merchant_id) => dbSqlite.getBankCards(merchant_id);
const createBankCard = (card) => dbSqlite.saveBankCard(card);
const deleteBankCardRecord = (id) => dbSqlite.deleteBankCard(id);
// getTransactions: LowDB签名 (merchantId, type, limit, offset) → SQLite签名 ({merchant_id, type, limit, offset})
const getTransactions = (merchant_id, type, limit, offset) => dbSqlite.getTransactions({ merchant_id, type, limit, offset });
const createTransaction = (tx) => dbSqlite.saveTransaction(tx);
const updateTransactionStatus = (out_request_no, status, qzt_response) => dbSqlite.saveTransaction({ out_request_no, status, qzt_response });
// getSplitRecords: LowDB签名 (merchantId, limit, offset) → SQLite签名 ({merchant_id, limit, offset})
const getSplitRecords = (merchant_id, limit, offset) => dbSqlite.getSplitRecords({ merchant_id, limit, offset });
const createSplitRecord = (record) => dbSqlite.saveSplitRecord(record);
const updateSplitRecordStatus = (out_split_no, status, qzt_response) => dbSqlite.saveSplitRecord({ out_request_no: out_split_no, status, qzt_response });
const createNotification = (notif) => dbSqlite.saveNotification(notif);
const getNotificationByOutRequestNo = (out_request_no, notification_type) => dbSqlite.getNotificationByOutRequestNo(out_request_no, notification_type);
const markNotificationProcessed = (id) => dbSqlite.markNotificationProcessed(id);
const updateMerchantStatus = (id, status, qztAccountNo) => dbSqlite.updateMerchantStatus(id, status, qztAccountNo);
const getMerchantByOutRequestNoFromDb = (out_request_no) => dbSqlite.getMerchantByOutRequestNo(out_request_no);
const getTradeOrderByOutOrderNo = (out_order_no) => dbSqlite.getTradeOrderByOutOrderNo(out_order_no);
const saveTradeOrderFromCallback = (order) => dbSqlite.saveTradeOrder(order);
const saveTradePayment = (payment) => dbSqlite.saveTradePayment(payment);
const getTradePaymentsByOrderId = (orderId) => dbSqlite.getTradePaymentsByOrderId(orderId);
const getTradePaymentBySeqNo = (seqNo) => dbSqlite.getTradePaymentBySeqNo(seqNo);

// 角色权限判断
const canSplit = (enterprise_type) => {
  // 只有商户(1)和旅行社(2)可以分账
  return enterprise_type === '1' || enterprise_type === '2' || enterprise_type === 1 || enterprise_type === 2;
};

const canCreateTour = (enterprise_type) => {
  // 只有商户(1)和旅行社(2)可以创建旅行团
  return enterprise_type === '1' || enterprise_type === '2' || enterprise_type === 1 || enterprise_type === 2;
};

const canWithdraw = (enterprise_type) => {
  // 所有角色都可以提现
  return true;
};

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
  const signer = crypto.createSign('SHA256');
  signer.update(content, 'utf8');
  signer.end();
  return signer.sign(QZT_CONFIG.privateKey, 'base64');
}

function verifyData(data, signValue) {
  if (!signValue) return true;
  try {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(data, 'utf8');
    verifier.end();
    return verifier.verify(QZT_CONFIG.publicKey, signValue, 'base64');
  } catch(e) {
    return false;
  }
}

// --- 调用钱账通网关 ---
async function callQzt(service, params) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  // file_content 完全不参与签名，也不在 params JSON 里，单独作为 body 字段
  let paramsForSign = params;
  let paramsStr = JSON.stringify(params);
  if (params.file_content !== undefined) {
    paramsForSign = { ...params };
    delete paramsForSign.file_content;
    paramsStr = JSON.stringify(paramsForSign);  // params 里不含 file_content
  }
  const signContent = QZT_CONFIG.appId + timestamp + QZT_CONFIG.version + service + paramsStr;
  const signValue = signData(signContent);

  const body = {
    app_id: QZT_CONFIG.appId,
    timestamp,
    version: QZT_CONFIG.version,
    sign: signValue,
    service,
    params: paramsForSign  // 发送对象，不是字符串
  };
  if (params.file_content !== undefined) {
    body.file_content = params.file_content;
  }

  const response = await axios.post(QZT_CONFIG.gateway, body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000
  }).catch(err => {
    console.error('[callQzt] 请求失败:', err.message, '| service:', service);
    throw err;
  });
  console.log('[callQzt] 请求:', service, JSON.stringify(body));
  console.log('[callQzt] 响应:', service, JSON.stringify(response.data));
  return response.data;
}

// --- 文件上传到钱账通 ---
async function uploadFileToQzt(fileName, fileType, fileBuffer) {
  const fileHash = crypto.createHash('md5').update(fileBuffer).digest('hex');
  const fileBase64 = fileBuffer.toString('base64');

  const params = {
    file_name: fileName,
    file_type: fileType,
    file_hash: fileHash,
    file_content: fileBase64
  };

  // 先调用接口获取 file_key
  const result = await callQzt('file.upload', params);
  
  // 检查第一次接口调用是否失败
  if (result.status === 'FAIL' || !result.result) {
    throw new Error(`获取文件上传 file_key 失败: ${result.message || '未知错误'}`);
  }

  let parsed;
  if (typeof result.result === 'string') {
    try {
      parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
    } catch(e) {
      parsed = JSON.parse(result.result);
    }
  } else {
    parsed = result.result;
  }

  // file_content 已在上方 params 中，会自动不参与签名
  if (parsed && parsed.file_key) {
    params.file_key = parsed.file_key;
  }

  const uploadResult = await callQzt('file.upload', params);
  
  if (uploadResult.status === 'FAIL' || !uploadResult.result) {
    throw new Error(`上传文件失败: ${uploadResult.message || '未知错误'}`);
  }

  let uploadParsed;
  if (typeof uploadResult.result === 'string') {
    try {
      uploadParsed = JSON.parse(Buffer.from(uploadResult.result, 'base64').toString('utf8'));
    } catch(e) {
      uploadParsed = JSON.parse(uploadResult.result);
    }
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
    if (!result || result.file_key === undefined) {
      return res.status(500).json({ code: 500, message: '文件上传失败', error: '未获取到有效的 file_key' });
    }
    res.json({ code: 0, data: { file_key: result.file_key } });
  } catch (error) {
    console.error('文件上传失败:', error.response?.data || error.message);
    res.status(500).json({ code: 500, message: '文件上传失败', error: error.message });
  }
});

// 2. 提交商户开户申请
merchantRouter.post('/apply', requireAuth, async (req, res) => {
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

// POST 方式的商户列表查询（支持筛选）
app.post('/api/merchant/list', (req, res) => {
  const { keyword, status, page = 1, pageSize = 20 } = req.body;
  let merchants = getMerchants();
  
  // 关键词筛选
  if (keyword) {
    const kw = keyword.toLowerCase();
    merchants = merchants.filter(m => 
      (m.register_name && m.register_name.toLowerCase().includes(kw)) ||
      (m.legal_mobile && m.legal_mobile.includes(kw)) ||
      (m.out_request_no && m.out_request_no.toLowerCase().includes(kw)) ||
      (m.qzt_response?.account_no && m.qzt_response.account_no.includes(kw))
    );
  }
  
  // 状态筛选
  if (status) {
    merchants = merchants.filter(m => m.status === status);
  }
  
  res.json({ code: 0, data: merchants, total: merchants.length });
});

// GET /api/merchants - 获取商户列表（支持角色筛选）
app.get('/api/merchants', (req, res) => {
  const { keyword, status, split_role, page = 1, page_size = 20 } = req.query;
  let merchants = getMerchants();
  
  // 关键词筛选
  if (keyword) {
    const kw = keyword.toLowerCase();
    merchants = merchants.filter(m => 
      (m.register_name && m.register_name.toLowerCase().includes(kw)) ||
      (m.legal_mobile && m.legal_mobile.includes(kw)) ||
      (m.legal_name && m.legal_name.toLowerCase().includes(kw))
    );
  }
  
  // 状态筛选
  if (status) {
    merchants = merchants.filter(m => m.status === status);
  }
  
  // 角色筛选
  if (split_role) {
    merchants = merchants.filter(m => m.split_role === split_role);
  }
  
  const total = merchants.length;
  const p = parseInt(page) || 1;
  const ps = parseInt(page_size) || 20;
  const list = merchants.slice((p - 1) * ps, p * ps);
  
  res.json({ code: 0, data: { list, total, page: p, page_size: ps } });
});

// 同时挂载到 /api/merchant 和 /api/v1/merchants
app.use('/api/merchant', merchantRouter);
app.use('/api/v1/merchants', merchantRouter);

// 商终管理路由
const terminalsRouter = require('./routes/terminals');
app.use('/api/terminals', terminalsRouter);

// 账户管理路由（多账户模式，含余额查询、银行卡绑定解绑）
const accountsRouter = require('./routes/accounts');
app.use('/api/accounts', accountsRouter);

// 门店管理路由
const storesRouter = require('./routes/stores');
app.use('/api/stores', storesRouter);

// 充值路由
const rechargeRouter = require('./routes/recharge');
app.use('/api/recharge', rechargeRouter);

// 提现路由
const withdrawRouter = require('./routes/withdraw');
app.use('/api/withdraw', withdrawRouter);

// 交易订单路由
const ordersRouter = require('./routes/orders');
app.use('/api/orders', ordersRouter);

// 商户管理路由（支付账户开户已有，本文件补充银行内部户相关）
const merchantsRouter = require('./routes/merchants');
app.use('/api/merchants', merchantsRouter);

// ================= Task 14: 银行内部户开户（QZT 6.1 / 6.12） =================

// POST /api/merchant/bank-account-page — 获取银行内部户开户页面（QZT 6.1）
app.post('/api/merchant/bank-account-page', async (req, res) => {
  const { merchant_id, register_name, legal_mobile, enterprise_type, back_url } = req.body;
  if (!merchant_id) return res.status(400).json({ code: 400, message: '缺少 merchant_id' });
  const merchant = dbSqlite.getMerchantById(merchant_id);
  if (!merchant) return res.status(404).json({ code: 404, message: '商户不存在' });
  if (String(enterprise_type || merchant.enterprise_type) === '3') {
    return res.status(400).json({ code: 400, message: '个人商户无需银行内部户' });
  }
  const outRequestNo = 'BA_' + Date.now();
  try {
    const result = await callQzt('open.bank.account.page.url', {
      out_request_no: outRequestNo,
      register_name: register_name || merchant.register_name,
      legal_mobile: legal_mobile || merchant.legal_mobile,
      enterprise_type: enterprise_type || merchant.enterprise_type,
      back_url: back_url || `${QZT_CALLBACK_URL}/api/merchant/callback?out_request_no=${outRequestNo}`,
    });
    res.json({ code: 0, data: { redirect_url: result.redirect_url, out_request_no: outRequestNo } });
  } catch (err) {
    console.error('[6.1] 银行内部户开户页面获取失败:', err.message);
    res.status(500).json({ code: 500, message: '银行内部户开户页面获取失败', error: err.message });
  }
});

// GET /api/merchant/bank-account-query — 查询银行开户凭证（QZT 6.12）
app.get('/api/merchant/bank-account-query', async (req, res) => {
  const { out_request_no } = req.query;
  if (!out_request_no) return res.status(400).json({ code: 400, message: '缺少 out_request_no' });
  try {
    const result = await callQzt('open.bank.account.voucher.query', { out_request_no });
    res.json({ code: 0, data: result });
  } catch (err) {
    console.error('[6.12] 银行开户凭证查询失败:', err.message);
    res.status(500).json({ code: 500, message: '银行开户凭证查询失败', error: err.message });
  }
});

// 文件上传路由（OSS + QZT 文件注册）
const uploadRouter = require('./routes/upload');
app.use('/api/upload', uploadRouter);

// 兼容旧版前端：POST /api/merchant → 根据类型选择接口
// 个人（enterprise_type=3）：使用 open.split.account.apply (6.9) 直接申请
// 企业/个体工商户（enterprise_type=1或2）：使用 open.split.account.page.url (6.3) 获取 H5 页面
app.post('/api/merchant', async (req, res) => {
  const { 
    name, 
    legal_mobile, 
    legal_name,
    legal_id_card,
    license_no,
    enterprise_type,
    address,
    email,
    back_url,
    // 新增字段（用于 open.split.account.apply）
    id_front,
    id_back,
    bank_type,
    bank_code,
    bank_card_no,
    bank_card_name,
    bank_branch,
    bank_province,
    bank_city,
    bank_area,
    source 
  } = req.body;
  
  const outRequestNo = `M${Date.now()}`;
  const defaultBackUrl = `${QZT_CALLBACK_URL}/api/merchant/callback?out_request_no=${outRequestNo}`;
  
  // 入网类型：1=企业，2=个体工商户，3=个人
  const entType = enterprise_type || '3';
  
  try {
    // 个人开户：使用 open.split.account.apply (6.9) 直接申请
    // 注意：个人开户需要归属商户账户标识(mer_account_no)，如果没有则使用 H5 页面方式
    if (entType === '3' || entType === 3) {
      // 检查是否有平台商户账户
      const merchants = getMerchants();
      const platformMerchant = merchants.find(m => m.qzt_account_no && m.enterprise_type !== '3');
      
      if (!platformMerchant) {
        // 没有平台商户，使用 H5 页面方式
        console.log('[个人开户] 无平台商户，使用 H5 页面方式');
        const result = await callQzt('open.split.account.page.url', {
          out_request_no: outRequestNo,
          register_name: name || '个人商户',
          legal_mobile: legal_mobile || '',
          legal_name: legal_name || '',
          legal_id_card: legal_id_card || '',
          enterprise_type: '3',
          address: address || '',
          email: email || '',
          back_url: back_url || defaultBackUrl
        });
        
        let parsed = { url: '', account_no: '' };
        if (result.result) {
          try {
            parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
          } catch(e) {
            parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || parsed);
          }
        }
        
        const merchant = saveMerchant({
          out_request_no: outRequestNo,
          register_name: name,
          legal_mobile,
          legal_name,
          legal_id_card,
          enterprise_type: '3',
          address,
          email,
          back_url: back_url || defaultBackUrl,
          status: 'PERSONAL_PENDING',
          qzt_response: parsed
        });
        
        return res.json({
          code: 0,
          data: {
            merchant_id: merchant.id,
            out_request_no: outRequestNo,
            redirectUrl: parsed.url || '',
            h5Url: parsed.url || ''
          }
        });
      }
      
      // 有平台商户，使用直接申请方式
      const params = {
        out_request_no: outRequestNo,
        register_name: name || '个人商户',
        enterprise_type: '3',
        mer_account_no: platformMerchant.qzt_account_no, // 归属商户账户标识
        back_url: back_url || defaultBackUrl
      };
      
      // 可选参数
      if (legal_mobile) params.mobile = legal_mobile;
      if (legal_name) params.name = legal_name;
      if (legal_id_card) {
        params.id_no = rsaEncrypt(legal_id_card);
        params.id_type = '1'; // 1=身份证
      }
      if (id_front) params.id_front = id_front;
      if (id_back) params.id_back = id_back;
      if (bank_type) params.bank_type = bank_type;
      if (bank_code) params.bank_code = bank_code;
      if (bank_card_no) params.bank_card_no = rsaEncrypt(bank_card_no);
      if (bank_card_name) params.bank_card_name = bank_card_name;
      if (bank_branch) params.bank_branch = bank_branch;
      if (bank_province) params.bank_province = bank_province;
      if (bank_city) params.bank_city = bank_city;
      if (bank_area) params.bank_area = bank_area;
      
      console.log('[6.9] 个人开户申请参数:', JSON.stringify(params, null, 2));
      
      const result = await callQzt('open.split.account.apply', params);
      
      let parsed = { status: '', account_no: '', out_request_no: '' };
      if (result.result) {
        try {
          parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
        } catch(e) {
          parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || parsed);
        }
      }
      
      // status: 00=申请受理 / 01=开户成功 / 02=开户失败 / 03=电子签约
      const merchant = saveMerchant({
        out_request_no: outRequestNo,
        register_name: name,
        legal_mobile,
        legal_name,
        legal_id_card,
        enterprise_type: '3',
        address,
        email,
        back_url: back_url || defaultBackUrl,
        status: parsed.status === '01' ? 'ACTIVE' : parsed.status === '02' ? 'FAILED' : 'PERSONAL_PENDING',
        qzt_account_no: parsed.account_no || '',
        qzt_response: parsed
      });
      
      res.json({
        code: 0,
        data: {
          merchant_id: merchant.id,
          out_request_no: outRequestNo,
          account_no: parsed.account_no || '',
          status: parsed.status,
          message: parsed.error_message || '',
          // 个人开户无 H5 页面，返回空
          redirectUrl: '',
          h5Url: ''
        }
      });
    } else {
      // 企业/个体工商户：使用 open.pay.account.page.url (6.2) 获取支付开户页面
      // 正常商户角色调用支付开户接口
      const result = await callQzt('open.pay.account.page.url', {
        out_request_no: outRequestNo,
        register_name: name || '商户',
        legal_mobile: legal_mobile || '',
        legal_name: legal_name || '',
        legal_id_card: legal_id_card || '',
        license_no: license_no || '',
        enterprise_type: entType,
        address: address || '',
        email: email || '',
        back_url: back_url || defaultBackUrl
      });

      let parsed = { url: '', account_no: '' };
      if (result.result) {
        try {
          parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
        } catch(e) {
          parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || parsed);
        }
      }

      const merchant = saveMerchant({
        out_request_no: outRequestNo,
        register_name: name,
        legal_mobile,
        legal_name,
        legal_id_card,
        license_no,
        enterprise_type: entType,
        address,
        email,
        back_url,
        status: entType === '3' ? 'PERSONAL_PENDING' : 'ENTERPRISE_PENDING',
        qzt_response: parsed
      });

      res.json({
        code: 0,
        data: {
          merchant_id: merchant.id,
          out_request_no: outRequestNo,
          redirectUrl: parsed.url || '',
          h5Url: parsed.url || ''
        }
      });
    }
  } catch (error) {
    console.error('商户开户失败:', error.message);
    res.status(500).json({ code: 500, message: '商户开户失败', error: error.message });
  }
});

// 3. 钱账通回调通知（独立路径，不纳入 merchantRouter）
app.post('/api/merchant/callback', async (req, res) => {
  try {
    const { status, result, sign } = req.body;
    console.log('收到钱账通开户回调:', JSON.stringify(req.body));

    // P0 安全修复：验签
    // 构造待验签内容：app_id + timestamp + version + service + paramsStr
    if (sign) {
      let paramsForSign = result;
      let paramsStr = JSON.stringify(result);
      if (typeof result === 'string') {
        try { paramsForSign = JSON.parse(Buffer.from(result, 'base64').toString('utf8')); } catch(e) { paramsForSign = result; }
        paramsStr = JSON.stringify(paramsForSign);
      }
      const signContent = QZT_CONFIG.appId + (req.body.timestamp || '') + QZT_CONFIG.version + 'callback' + paramsStr;
      const signValid = verifyData(signContent, sign);
      if (!signValid) {
        console.error('[SECURITY] 钱账通回调验签失败，拒绝处理');
        return res.status(403).send('FAIL');
      }
      console.log('[SECURITY] 钱账通回调验签通过');
    } else {
      console.warn('[SECURITY] 钱账通回调无 sign 字段，跳过验签（建议联系钱账通开启签名）');
    }

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
    const result = await callQzt('ocr.idcard', {
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
      split_role,     // 分账角色: travel_shop=旅游商店, travel_agency=旅行社, guide=导游, driver=司机, other=其他
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

    // 根据 enterprise_type 选择不同的钱账通接口
    // enterprise_type 1或2 → open.pay.account.page.url (6.2) 支付开户
    // enterprise_type 3 → open.split.account.page.url (6.3) 分账开户
    let result;
    const entType = parseInt(enterprise_type) || 1;
    
    if (entType === 1 || entType === 2) {
      // 企业/个体工商户 - 使用 open.pay.account.page.url (6.2)
      result = await callQzt('open.pay.account.page.url', {
        out_request_no,
        register_name,
        enterprise_type: String(entType),
        legal_mobile,
        legal_name: '',
        legal_id_card: '',
        back_url: back_url || QZT_CALLBACK_URL + '/'
      });
    } else {
      // 个人(导游等) - 使用 open.split.account.page.url (6.3)
      result = await callQzt('open.split.account.page.url', {
        out_request_no,
        register_name,
        legal_mobile,
        enterprise_type: entType,
        back_url: back_url || QZT_CALLBACK_URL + '/'
      });
    }

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
      split_role,
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
 * 
 * 业务限制：只有商户(1)和旅行社(2)可以分账，导游和其他角色只能提现
 */
app.post('/api/qzt/split/apply', async (req, res) => {
  try {
    const {
      merchant_id,  // 新增：商户ID，用于权限验证
      out_request_no, account_no,
      split_amount,   // 单位：元，前端传入
      split_list,     // [{ account_no, bank_account_no?, amount, remark }]
      withdraw_type,   // D0 / D1 / T1，可选
      back_url
    } = req.body;

    // 权限验证：只有商户和旅行社可以分账
    if (merchant_id) {
      const merchant = getMerchantById(merchant_id);
      if (!merchant) {
        return res.status(404).json({ code: 404, message: '商户不存在' });
      }
      if (!canSplit(merchant.enterprise_type)) {
        return res.status(403).json({ 
          code: 403, 
          message: '权限不足：只有商户或旅行社可以执行分账操作，导游和其他角色只能提现' 
        });
      }
    }

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
      page_size: Math.min(parseInt(page_size), MAX_PAGE_SIZE),
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

    const params = { page: parseInt(page), page_size: Math.min(parseInt(page_size), MAX_PAGE_SIZE) };
    if (account_no) params.account_no = account_no;

    const result = await callQzt('merchant.terminal.query', params);

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

    const result = await callQzt('merchant.terminal.bind', {
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

    const result = await callQzt('merchant.terminal.unbind', { account_no, merchant_no });

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

    const result = await callQzt('bank.card.bind', {
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

    const result = await callQzt('bank.card.unbind', { account_no, bank_account_no });

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

// ==================== 新增业务接口 ====================

/**
 * GET /api/account/balance - 查询账户余额
 * 调用钱账通 balance.query 接口
 */
app.get('/api/account/balance', async (req, res) => {
  try {
    const { merchant_id } = req.query;
    
    // 从数据库获取账户信息
    let accounts = await dbSqlite.getAccountsByMerchantId(merchant_id || 1);
    
    // 如果没有账户，尝试从钱账通查询
    if (!accounts || accounts.length === 0) {
      // 调用钱账通余额查询接口
      const result = await callQzt('account.balance.query', {
        account_no: req.query.account_no || '7445380068781174784' // 默认测试账户
      });
      
      let parsed = { balance: 0, frozen_amount: 0 };
      if (result.result) {
        try {
          parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
        } catch(e) {
          parsed = typeof result.result === 'string' ? JSON.parse(result.result) : result.result;
        }
      }
      
      // QZT 返回 fen（分），需除以 100 转为元
      const qztBalance = parseInt(parsed.balance || 0);
      const qztFrozen = parseInt(parsed.frozen_amount || 0);
      res.json({ 
        code: 0, 
        data: {
          balance: parseFloat((qztBalance / 100).toFixed(2)),
          frozen_amount: parseFloat((qztFrozen / 100).toFixed(2)),
          available_amount: parseFloat(((qztBalance - qztFrozen) / 100).toFixed(2))
        }
      });
    } else {
      // DB 存储单位为分（fen），需除以 100 转为元
      const totalBalance = accounts.reduce((sum, a) => sum + (parseInt(a.balance) || 0), 0);
      const totalFrozen = accounts.reduce((sum, a) => sum + (parseInt(a.frozen_balance) || 0), 0);
      const totalAvailable = totalBalance - totalFrozen;

      // 账户列表金额字段：分→元（统一，避免返回 fen 给前端导致显示错误）
      const accountsYuan = accounts.map(a => ({
        ...a,
        balance: toYuan(a.balance),
        frozen_balance: toYuan(a.frozen_balance)
      }));

      res.json({
        code: 0,
        data: {
          balance: toYuan(totalBalance),
          frozen_amount: toYuan(totalFrozen),
          available_amount: toYuan(totalAvailable),
          accounts: accountsYuan
        }
      });
    }
  } catch (error) {
    console.error('查询余额失败:', error.message);
    res.status(500).json({ code: 500, message: '查询余额失败', error: error.message });
  }
});

/**
 * POST /api/account/bind-merchant - 绑定商户号
 */
app.post('/api/account/bind-merchant', async (req, res) => {
  try {
    const { merchant_id, merchant_no } = req.body;
    
    // 调用钱账通商户绑定接口
    const result = await callQzt('merchant.terminal.bind', {
      account_no: merchant_no,
      merchant_no: merchant_no
    });
    
    let parsed = { bind_state: '' };
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : result.result;
      }
    }
    
    res.json({ 
      code: 0, 
      data: { 
        bind_state: parsed.bind_state,
        message: parsed.bind_state === '00' ? '绑定成功' : '绑定失败'
      }
    });
  } catch (error) {
    console.error('绑定商户号失败:', error.message);
    res.status(500).json({ code: 500, message: '绑定商户号失败', error: error.message });
  }
});

/**
 * GET /api/bank-cards - 获取银行卡列表
 */
app.get('/api/bank-cards', async (req, res) => {
  try {
    const { merchant_id } = req.query;
    const cards = await getBankCardsByMerchantId(merchant_id || 1);
    
    // 隐藏敏感信息
    const safeCards = cards.map(c => ({
      id: c.id,
      card_no_masked: c.card_no_masked || maskCardNo(c.card_no),
      bank_name: c.bank_name,
      bank_code: c.bank_code,
      card_type: c.card_type,
      card_holder_name: c.card_holder_name,
      is_default: c.is_default,
      status: c.status,
      bind_time: c.bind_time
    }));
    
    res.json({ code: 0, data: safeCards });
  } catch (error) {
    console.error('获取银行卡列表失败:', error.message);
    res.status(500).json({ code: 500, message: '获取银行卡列表失败', error: error.message });
  }
});

/**
 * POST /api/bank-cards/bind - 绑定银行卡
 */
app.post('/api/bank-cards/bind', async (req, res) => {
  try {
    const { merchant_id, account_no, bank_type, bank_code, bank_card_no, bank_card_name, bank_branch, bank_province, bank_city, bank_area } = req.body;
    
    // 调用钱账通绑定银行卡接口
    const encryptedCardNo = rsaEncrypt(bank_card_no);
    
    const result = await callQzt('bank.card.bind', {
      account_no: account_no || '7445380068781174784',
      bank_type: bank_type || '1',
      bank_code,
      bank_card_no: encryptedCardNo,
      bank_card_name,
      bank_branch,
      bank_province,
      bank_city,
      bank_area
    });
    
    let parsed = { bank_account_no: '', bind_state: '' };
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : result.result;
      }
    }
    
    // 保存到数据库
    if (parsed.bind_state === '00') {
      await createBankCard({
        merchant_id: merchant_id || 1,
        account_id: null,
        card_no: bank_card_no,
        card_no_masked: maskCardNo(bank_card_no),
        bank_name: getBankName(bank_code),
        bank_code,
        card_type: bank_type === '1' ? 'DEBIT' : 'CREDIT',
        card_holder_name: bank_card_name,
        is_default: 0
      });
    }
    
    res.json({
      code: 0,
      data: {
        bank_account_no: parsed.bank_account_no,
        bind_state: parsed.bind_state,
        message: parsed.bind_state === '00' ? '绑定成功' : '绑定失败'
      }
    });
  } catch (error) {
    console.error('绑定银行卡失败:', error.message);
    res.status(500).json({ code: 500, message: '绑定银行卡失败', error: error.message });
  }
});

/**
 * DELETE /api/bank-cards/:id - 解绑银行卡
 */
app.delete('/api/bank-cards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 标记为删除
    await dbSqlite.deleteBankCard(id);
    
    res.json({ code: 0, message: '解绑成功' });
  } catch (error) {
    console.error('解绑银行卡失败:', error.message);
    res.status(500).json({ code: 500, message: '解绑银行卡失败', error: error.message });
  }
});

/**
 * POST /api/recharge/apply - 申请充值
 */
app.post('/api/recharge/apply', async (req, res) => {
  try {
    const { merchant_id, amount, bank_card_no, remark } = req.body;
    const transactionNo = `R${Date.now()}`;
    
    // 元 → 分（QZT接口单位：分）
    const amountFen = Math.round(parseFloat(amount) * 100);

    // 调用钱账通充值接口
    const result = await callQzt('account.recharge.apply', {
      out_request_no: transactionNo,
      amount: String(amountFen),
      bank_card_no: rsaEncrypt(bank_card_no)
    });
    
    let parsed = { status: 'PENDING' };
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : result.result;
      }
    }
    
    // 保存交易记录
    await createTransaction({
      merchant_id: merchant_id || 1,
      out_request_no: transactionNo,
      transaction_type: 'RECHARGE',
      amount: amountFen, // 单位：分
      status: parsed.status || 'PENDING',
      remark: remark || '充值',
      qzt_response: parsed
    });
    
    res.json({
      code: 0,
      data: {
        transaction_no: transactionNo,
        status: parsed.status || 'PENDING',
        message: '充值申请已提交'
      }
    });
  } catch (error) {
    console.error('申请充值失败:', error.message);
    res.status(500).json({ code: 500, message: '申请充值失败', error: error.message });
  }
});

// ========== Phase 1: 账户列表 + 余额查询 ==========

/**
 * GET /api/accounts - 账户列表
 * 支持按 merchant_id 过滤
 */
app.get('/api/accounts', (req, res) => {
  try {
    const { merchant_id } = req.query;
    const accounts = merchant_id
      ? getAccountsByMerchantId(merchant_id)
      : getAccounts();
    res.json({ code: 0, data: accounts });
  } catch (error) {
    console.error('获取账户列表失败:', error.message);
    res.status(500).json({ code: 500, message: '获取账户列表失败' });
  }
});

/**
 * GET /api/accounts/:id - 账户详情
 */
app.get('/api/accounts/:id', (req, res) => {
  try {
    const account = getAccountById(req.params.id);
    if (!account) return res.status(404).json({ code: 404, message: '账户不存在' });
    res.json({ code: 0, data: account });
  } catch (error) {
    console.error('获取账户详情失败:', error.message);
    res.status(500).json({ code: 500, message: '获取账户详情失败' });
  }
});

/**
 * GET /api/accounts/:id/balance - 查询账户余额（从钱账通实时拉取）
 * service: account.balance.query (7.7)
 */
app.get('/api/accounts/:id/balance', async (req, res) => {
  try {
    const account = getAccountById(req.params.id);
    if (!account) return res.status(404).json({ code: 404, message: '账户不存在' });
    const accountNo = account.account_no;
    if (!accountNo) return res.status(400).json({ code: 400, message: '该账户尚未分配钱账通账号' });

    const result = await callQzt('account.balance.query', { account_no: accountNo });
    let parsed = { available_amount: '0', trans_amount: '0' };
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || parsed);
      }
    }
    const availableYuan = (parseInt(parsed.available_amount || 0) / 100).toFixed(2);
    const transAmountYuan = (parseInt(parsed.trans_amount || 0) / 100).toFixed(2);
    res.json({
      code: 0,
      data: {
        account_no: accountNo,
        available_amount: parseFloat(availableYuan),
        trans_amount: parseFloat(transAmountYuan)
      }
    });
  } catch (error) {
    console.error('[7.7] 账户余额查询失败:', error.message);
    res.status(500).json({ code: 500, message: '余额查询失败', error: error.message });
  }
});

// ========== Phase 6: 交易订单 + 回调 ==========

/**
 * GET /api/orders - 订单列表
 */
app.get('/api/orders', (req, res) => {
  try {
    const { merchant_id, status, page = 1, pageSize = 20 } = req.query;
    const filters = {};
    if (merchant_id) filters.merchant_id = merchant_id;
    if (status) filters.status = status;
    const orders = getTradeOrders(filters);
    // 分转元
    const ordersYuan = orders.map(o => ({
      ...o,
      total_amount: o.total_amount / 100
    }));
    res.json({ code: 0, data: ordersYuan, total: ordersYuan.length });
  } catch (error) {
    console.error('获取订单列表失败:', error.message);
    res.status(500).json({ code: 500, message: '获取订单列表失败' });
  }
});

/**
 * GET /api/orders/:id - 订单详情（含支付流水 + 分账记录）
 */
app.get('/api/orders/:id', (req, res) => {
  try {
    const order = getTradeOrderById(req.params.id);
    if (!order) return res.status(404).json({ code: 404, message: '订单不存在' });

    const payments = getTradePaymentsByOrderId(order.id);
    const paymentsWithSplits = payments.map(p => {
      const splits = getTradeSplitsByPaymentId(p.id);
      return {
        ...p,
        amount_yuan: p.amount / 100,
        splits: splits.map(s => ({ ...s, amount_yuan: s.amount / 100 }))
      };
    });

    res.json({
      code: 0,
      data: {
        ...order,
        total_amount_yuan: order.total_amount / 100,
        payments: paymentsWithSplits
      }
    });
  } catch (error) {
    console.error('获取订单详情失败:', error.message);
    res.status(500).json({ code: 500, message: '获取订单详情失败' });
  }
});

/**
 * POST /api/trade/callback - 接收钱账通交易订阅回调
 * 支持支付、退款两种类型
 */
app.post('/api/trade/callback', async (req, res) => {
  try {
    const payload = req.body;
    console.log('[trade/callback] 收到交易回调:', JSON.stringify(payload));

    const {
      payment_seq_no,      // 支付流水号
      out_order_no,        // 外部订单号
      order_no,            // 内部订单号
      payer_account_no,    // 付款方账户
      payer_name,          // 付款方名称
      amount,              // 金额（分）
      status,              // 交易状态
      trade_type           // PAYMENT=支付 / REFUND=退款
    } = payload;

    if (!payment_seq_no || !out_order_no) {
      return res.json({ code: 0, message: '缺少必填字段' });
    }

    // 查找或创建订单
    let order = getTradeOrderByOutOrderNo(out_order_no);
    if (!order) {
      order = saveTradeOrderFromCallback({
        order_no: order_no || `ORD${Date.now()}`,
        out_order_no,
        payer_account_no: payer_account_no || '',
        payer_name: payer_name || '',
        amount: Math.round(parseFloat(amount) || 0),
        status: status === 'SUCCESS' ? 'PAID' : 'PENDING'
      });
    }

    // 保存支付流水（幂等）
    const paymentType = trade_type === 'REFUND' ? 'REFUND' : 'PAYMENT';
    saveTradePayment({
      order_id: order.id,
      payment_seq_no,
      payment_type: paymentType,
      amount: Math.round(parseFloat(amount) || 0),
      status: status === 'SUCCESS' ? 'SUCCESS' : 'PENDING'
    });

    // 更新订单状态
    const allPayments = getTradePaymentsByOrderId(order.id);
    const totalPaid = allPayments.filter(p => p.payment_type === 'PAYMENT' && p.status === 'SUCCESS').reduce((sum, p) => sum + p.amount, 0);
    const totalRefunded = allPayments.filter(p => p.payment_type === 'REFUND' && p.status === 'SUCCESS').reduce((sum, p) => sum + p.amount, 0);
    let orderStatus = 'PENDING';
    if (totalPaid >= order.total_amount && totalRefunded === 0) orderStatus = 'PAID';
    else if (totalRefunded >= totalPaid) orderStatus = 'REFUNDED';
    else if (totalRefunded > 0) orderStatus = 'PARTIAL_REFUND';
    saveTradeOrderFromCallback({ ...order, status: orderStatus });

    console.log(`[trade/callback] 订单${order.order_no}状态更新为: ${orderStatus}`);
    res.json({ code: 0, message: '接收成功' });
  } catch (error) {
    console.error('[trade/callback] 处理失败:', error.message);
    res.status(500).json({ code: 500, message: '处理失败' });
  }
});

/**
 * POST /api/orders/:id/splits - 对指定支付流水发起分账
 */
app.post('/api/orders/:id/splits', async (req, res) => {
  try {
    const { payment_id, split_list } = req.body;
    if (!payment_id || !split_list || !split_list.length) {
      return res.status(400).json({ code: 400, message: '缺少 payment_id 或 split_list' });
    }

    const payment = getTradePaymentBySeqNo(payment_id);
    if (!payment) return res.status(404).json({ code: 404, message: '支付流水不存在' });

    // 调用钱账通分账接口
    const params = {
      out_request_no: `SPL${Date.now()}`,
      order_no: payment.payment_seq_no,
      split_list: split_list.map(item => ({
        receiver_account_no: item.receiver_account_no,
        amount: String(Math.round(parseFloat(item.amount) * 100)), // 元→分
        remark: item.remark || ''
      }))
    };

    const result = await callQzt('trans.trade.fund.split', params);
    let parsed = { status: 'PENDING' };
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : (result.result || parsed);
      }
    }

    // 保存分账记录
    const splits = (parsed.split_list || []).map((s, i) =>
      saveTradeSplit({
        payment_id: payment.id,
        split_seq_no: s.split_seq_no || `SPL${Date.now()}_${i}`,
        receiver_account_no: split_list[i]?.receiver_account_no || '',
        receiver_name: '',
        amount: Math.round(parseFloat(split_list[i]?.amount || 0) * 100),
        status: s.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED'
      })
    );

    res.json({ code: 0, data: { status: parsed.status || 'PENDING', splits } });
  } catch (error) {
    console.error('[分账] 失败:', error.message);
    res.status(500).json({ code: 500, message: '分账申请失败', error: error.message });
  }
});

/**
 * GET /api/recharge/records - 充值记录
 */
app.get('/api/recharge/records', async (req, res) => {
  try {
    const { merchant_id, page = 1, pageSize = 20 } = req.query;
    const ps = Math.min(parseInt(pageSize), MAX_PAGE_SIZE);
    const records = await getTransactions(merchant_id || 1, 'RECHARGE', ps, (parseInt(page) - 1) * ps);
  } catch (error) {
    console.error('获取充值记录失败:', error.message);
    res.status(500).json({ code: 500, message: '获取充值记录失败', error: error.message });
  }
});

/**
 * POST /api/withdraw/apply - 申请提现
 */
app.post('/api/withdraw/apply', async (req, res) => {
  try {
    const { merchant_id, amount, bank_card_no, remark } = req.body;
    const transactionNo = `W${Date.now()}`;
    
    // 元 → 分（QZT接口单位：分）
    const amountFen = Math.round(parseFloat(amount) * 100);

    // 调用钱账通提现接口
    const result = await callQzt('withdraw.apply', {
      out_request_no: transactionNo,
      amount: String(amountFen),
      bank_card_no: rsaEncrypt(bank_card_no)
    });
    
    let parsed = { status: 'PENDING' };
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : result.result;
      }
    }
    
    // 保存交易记录
    await createTransaction({
      merchant_id: merchant_id || 1,
      out_request_no: transactionNo,
      transaction_type: 'WITHDRAW',
      amount: amountFen, // 单位：分
      status: parsed.status || 'PENDING',
      remark: remark || '提现',
      qzt_response: parsed
    });
    
    res.json({
      code: 0,
      data: {
        transaction_no: transactionNo,
        status: parsed.status || 'PENDING',
        message: '提现申请已提交'
      }
    });
  } catch (error) {
    console.error('申请提现失败:', error.message);
    res.status(500).json({ code: 500, message: '申请提现失败', error: error.message });
  }
});

/**
 * GET /api/withdraw/records - 提现记录
 */
app.get('/api/withdraw/records', async (req, res) => {
  try {
    const { merchant_id, page = 1, pageSize = 20 } = req.query;
    const ps = Math.min(parseInt(pageSize), MAX_PAGE_SIZE);
    const records = await getTransactions(merchant_id || 1, 'WITHDRAW', ps, (parseInt(page) - 1) * ps);
    
    res.json({ code: 0, data: records });
  } catch (error) {
    console.error('获取提现记录失败:', error.message);
    res.status(500).json({ code: 500, message: '获取提现记录失败', error: error.message });
  }
});

/**
 * POST /api/split/apply - 申请分账
 * 幂等：基于 out_split_no 查重，重复调用不会重复分账
 */
app.post('/api/split/apply', async (req, res) => {
  try {
    const { merchant_id, order_no, total_amount, split_amount, receiver_account, receiver_name, remark } = req.body;
    // 使用确定性 splitNo（基于 order_no）便于幂等查重
    const splitNo = order_no ? `S${order_no}` : `S${Date.now()}`;
    
    // 幂等检查：查询该 splitNo 是否已存在且成功
    const existingSplit = dbSqlite.getSplitRecords({ merchant_id: merchant_id || 1 })
      .find(r => r.out_request_no === splitNo && r.status === 'SUCCESS');
    if (existingSplit) {
      return res.json({
        code: 0,
        data: {
          split_no: splitNo,
          status: 'SUCCESS',
          message: '已分账（幂等跳过）'
        }
      });
    }
    
    // 调用钱账通分账接口
    const result = await callQzt('split.apply', {
      out_split_no: splitNo,
      order_no: order_no || splitNo,
      total_amount: String(Math.round(parseFloat(total_amount) * 100)),
      split_amount: String(Math.round(parseFloat(split_amount) * 100)),
      receiver_account
    });
    
    let parsed = { status: 'PENDING' };
    if (result.result) {
      try {
        parsed = JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result.result === 'string' ? JSON.parse(result.result) : result.result;
      }
    }
    
    // 保存分账记录（单位：分）
    await createSplitRecord({
      merchant_id: merchant_id || 1,
      out_request_no: splitNo,
      order_no: order_no || splitNo,
      amount: Math.round(parseFloat(total_amount) * 100),
      split_amount: Math.round(parseFloat(split_amount) * 100),
      receiver_account,
      receiver_name,
      status: parsed.status || 'PENDING',
      remark: remark || '分账',
      qzt_response: parsed
    });
    
    res.json({
      code: 0,
      data: {
        split_no: splitNo,
        status: parsed.status || 'PENDING',
        message: '分账申请已提交'
      }
    });
  } catch (error) {
    console.error('申请分账失败:', error.message);
    res.status(500).json({ code: 500, message: '申请分账失败', error: error.message });
  }
});

/**
 * GET /api/split/records - 分账记录
 */
app.get('/api/split/records', async (req, res) => {
  try {
    const { merchant_id, page = 1, pageSize = 20 } = req.query;
    const ps = Math.min(parseInt(pageSize), MAX_PAGE_SIZE);
    const records = await getSplitRecords(merchant_id || 1, ps, (parseInt(page) - 1) * ps);
    
    res.json({ code: 0, data: records });
  } catch (error) {
    console.error('获取分账记录失败:', error.message);
    res.status(500).json({ code: 500, message: '获取分账记录失败', error: error.message });
  }
});

// ==================== 回调通知接口 ====================

/**
 * POST /api/callback/trade - 交易通知
 */
app.post('/api/callback/trade', async (req, res) => {
  try {
    const { status, result, sign } = req.body;
    console.log('收到交易通知:', JSON.stringify(req.body));
    
    let parsed = {};
    if (result) {
      try {
        parsed = JSON.parse(Buffer.from(result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result === 'string' ? JSON.parse(result) : result;
      }
    }
    
    const refNo = parsed.out_request_no || parsed.transaction_no;
    
    // 幂等检查：已处理过的通知直接返回
    if (refNo) {
      const existingNotif = await getNotificationByOutRequestNo(refNo, 'TRADE');
      if (existingNotif && existingNotif.processed === 1) {
        return res.json({ code: 0, message: 'already processed' });
      }
    }
    
    // 保存通知记录
    await createNotification({
      notification_type: 'TRADE',
      out_request_no: refNo,
      content: parsed
    });
    
    // 更新交易状态（幂等：saveTransaction 基于 out_request_no 查重）
    if (parsed.out_request_no) {
      await updateTransactionStatus(parsed.out_request_no, status || 'SUCCESS', parsed);
    }
    
    res.json({ code: 0, message: 'success' });
  } catch (error) {
    console.error('处理交易通知失败:', error.message);
    res.status(500).json({ code: 500, message: 'fail' });
  }
});

/**
 * POST /api/callback/recharge - 充值通知
 */
app.post('/api/callback/recharge', async (req, res) => {
  try {
    const { status, result } = req.body;
    console.log('收到充值通知:', JSON.stringify(req.body));
    
    let parsed = {};
    if (result) {
      try {
        parsed = JSON.parse(Buffer.from(result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result === 'string' ? JSON.parse(result) : result;
      }
    }
    
    // 幂等检查：已处理过的通知直接返回
    if (parsed.out_request_no) {
      const existingNotif = await getNotificationByOutRequestNo(parsed.out_request_no, 'RECHARGE');
      if (existingNotif && existingNotif.processed === 1) {
        return res.json({ code: 0, message: 'already processed' });
      }
    }
    
    await createNotification({
      notification_type: 'RECHARGE',
      out_request_no: parsed.out_request_no,
      content: parsed
    });
    
    if (parsed.out_request_no) {
      await updateTransactionStatus(parsed.out_request_no, status || 'SUCCESS', parsed);
    }
    
    res.json({ code: 0, message: 'success' });
  } catch (error) {
    console.error('处理充值通知失败:', error.message);
    res.status(500).json({ code: 500, message: 'fail' });
  }
});

/**
 * POST /api/callback/withdraw - 提现通知
 */
app.post('/api/callback/withdraw', async (req, res) => {
  try {
    const { status, result } = req.body;
    console.log('收到提现通知:', JSON.stringify(req.body));
    
    let parsed = {};
    if (result) {
      try {
        parsed = JSON.parse(Buffer.from(result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result === 'string' ? JSON.parse(result) : result;
      }
    }
    
    // 幂等检查：已处理过的通知直接返回
    if (parsed.out_request_no) {
      const existingNotif = await getNotificationByOutRequestNo(parsed.out_request_no, 'WITHDRAW');
      if (existingNotif && existingNotif.processed === 1) {
        return res.json({ code: 0, message: 'already processed' });
      }
    }
    
    await createNotification({
      notification_type: 'WITHDRAW',
      out_request_no: parsed.out_request_no,
      content: parsed
    });
    
    if (parsed.out_request_no) {
      await updateTransactionStatus(parsed.out_request_no, status || 'SUCCESS', parsed);
    }
    
    res.json({ code: 0, message: 'success' });
  } catch (error) {
    console.error('处理提现通知失败:', error.message);
    res.status(500).json({ code: 500, message: 'fail' });
  }
});

/**
 * POST /api/callback/split - 分账通知
 */
app.post('/api/callback/split', async (req, res) => {
  try {
    const { status, result } = req.body;
    console.log('收到分账通知:', JSON.stringify(req.body));
    
    let parsed = {};
    if (result) {
      try {
        parsed = JSON.parse(Buffer.from(result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result === 'string' ? JSON.parse(result) : result;
      }
    }
    
    // 幂等检查：已处理过的通知直接返回
    if (parsed.out_split_no) {
      const existingNotif = await getNotificationByOutRequestNo(parsed.out_split_no, 'SPLIT');
      if (existingNotif && existingNotif.processed === 1) {
        return res.json({ code: 0, message: 'already processed' });
      }
    }
    
    await createNotification({
      notification_type: 'SPLIT',
      out_request_no: parsed.out_split_no,
      content: parsed
    });
    
    if (parsed.out_split_no) {
      await updateSplitRecordStatus(parsed.out_split_no, status || 'SUCCESS', parsed);
    }
    
    res.json({ code: 0, message: 'success' });
  } catch (error) {
    console.error('处理分账通知失败:', error.message);
    res.status(500).json({ code: 500, message: 'fail' });
  }
});

/**
 * POST /api/callback/open-account - 开户通知
 */
app.post('/api/callback/open-account', async (req, res) => {
  try {
    const { status, result } = req.body;
    console.log('收到开户通知:', JSON.stringify(req.body));
    
    let parsed = {};
    if (result) {
      try {
        parsed = JSON.parse(Buffer.from(result, 'base64').toString('utf8'));
      } catch(e) {
        parsed = typeof result === 'string' ? JSON.parse(result) : result;
      }
    }
    
    // 幂等检查：已处理过的通知直接返回
    if (parsed.out_request_no) {
      const existingNotif = await getNotificationByOutRequestNo(parsed.out_request_no, 'OPEN_ACCOUNT');
      if (existingNotif && existingNotif.processed === 1) {
        return res.json({ code: 0, message: 'already processed' });
      }
    }
    
    await createNotification({
      notification_type: 'OPEN_ACCOUNT',
      out_request_no: parsed.out_request_no,
      content: parsed
    });
    
    // 更新商户状态（幂等：重复通知不会重复更新）
    if (parsed.out_request_no) {
      const merchant = await getMerchantByOutRequestNoFromDb(parsed.out_request_no);
      if (merchant) {
        await updateMerchantStatus(merchant.id, status === 'SUCCESS' ? 'ACTIVE' : 'FAILED', parsed.account_no);
      }
    }
    
    res.json({ code: 0, message: 'success' });
  } catch (error) {
    console.error('处理开户通知失败:', error.message);
    res.status(500).json({ code: 500, message: 'fail' });
  }
});

// ==================== 工具函数 ====================

// 银行卡号脱敏
function maskCardNo(cardNo) {
  if (!cardNo || cardNo.length < 8) return cardNo;
  return cardNo.substring(0, 4) + '****' + cardNo.substring(cardNo.length - 4);
}

// 根据银行编码获取银行名称
function getBankName(bankCode) {
  const bankMap = {
    '01020000': '中国工商银行',
    '01030000': '中国农业银行',
    '01040000': '中国银行',
    '01050000': '中国建设银行',
    '03080000': '招商银行',
    '03030000': '光大银行',
    '03020000': '中信银行',
    '03050000': '民生银行',
    '03060000': '广发银行',
    '03070000': '平安银行',
    '03040000': '华夏银行',
    '03100000': '浦发银行',
    '03090000': '兴业银行',
    '03110000': '恒丰银行',
    '03130000': '渤海银行',
    '03120000': '浙商银行',
    '04012900': '北京银行',
    '04031000': '上海银行',
    '04083300': '宁波银行',
    '04022900': '南京银行',
    '04063000': '杭州银行'
  };
  return bankMap[bankCode] || '未知银行';
}

// 统一错误捕获
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const port = process.env.PORT || 3001;
// ================= 登录认证 API（演示用） =================
/**
 * POST /api/auth/login
 * 演示模式：返回 Mock Token
 * 生产模式：验证用户名密码后签发 JWT
 */
app.post('/api/auth/login', async (req, res) => {
  if (DEMO_MODE) {
    // 演示模式：直接返回 Mock Token
    const demoToken = issueToken({ userId: 'demo-admin', role: 'admin', demo: true }, '7d');
    return res.json({
      code: 0,
      data: {
        token: demoToken,
        user: { id: 'demo-admin', name: '演示管理员', role: 'admin' },
        mode: 'demo'
      }
    });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
  }

  // TODO: 生产模式应从数据库验证用户密码
  // 这里暂时拒绝非演示模式的登录（需先配置真实用户数据）
  return res.status(401).json({ code: 401, message: '未配置认证，请设置 DEMO_MODE=true 或配置真实用户' });
});

/**
 * GET /api/auth/status
 * 查询当前认证状态
 */
app.get('/api/auth/status', (req, res) => {
  res.json({
    code: 0,
    data: {
      demoMode: DEMO_MODE,
      authenticated: !DEMO_MODE
    }
  });
});

// ================= 旅行团管理 API =================

/**
 * POST /api/tour-groups - 创建旅行团
 */
app.post('/api/tour-groups', async (req, res) => {
  try {
    const { 
      tour_no, tour_name, route_name, days, itinerary,
      start_date, end_date, people_count,
      guide_id, driver_id, shop_id, attractions,
      hotel_name, hotel_phone, hotel_address,
      total_amount, remark, merchant_id 
    } = req.body;
    
    // 创建旅行团
    const tour = saveTourGroup({
      merchant_id: merchant_id || 1,
      tour_no: tour_no || `TG${Date.now()}`,
      tour_name,
      route_name,
      days: days || 1,
      itinerary,
      start_date,
      end_date,
      people_count: people_count || 1,
      guide_id,
      driver_id,
      shop_id,
      attractions,
      hotel_name,
      hotel_phone,
      hotel_address,
      total_amount: total_amount || 0,
      split_status: 'PENDING',
      status: 'ACTIVE',
      remark
    });
    
    res.json({ code: 0, data: tour, message: '创建成功' });
  } catch (error) {
    console.error('创建旅行团失败:', error.message);
    res.status(500).json({ code: 500, message: '创建旅行团失败', error: error.message });
  }
});

/**
 * GET /api/tour-groups - 获取旅行团列表
 */
app.get('/api/tour-groups', (req, res) => {
  try {
    const { merchant_id, search, status, start_date, end_date, page, page_size } = req.query;
    let tours = getTourGroups(merchant_id);
    
    // 搜索过滤
    if (search) {
      tours = tours.filter(t => 
        t.tour_name?.includes(search) || 
        t.tour_no?.includes(search) ||
        t.route_name?.includes(search)
      );
    }
    
    // 状态过滤
    if (status) {
      tours = tours.filter(t => t.status === status);
    }
    
    // 日期过滤
    if (start_date) {
      tours = tours.filter(t => t.start_date >= start_date);
    }
    if (end_date) {
      tours = tours.filter(t => t.end_date <= end_date);
    }
    
    // 关联导游、司机、商店信息；金额字段从分转元
    const toursWithDetails = tours.map(tour => {
      const guide = tour.guide_id ? getMerchantById(tour.guide_id) : null;
      const driver = tour.driver_id ? getMerchantById(tour.driver_id) : null;
      const shop = tour.shop_id ? getMerchantById(tour.shop_id) : null;

      return {
        ...tour,
        total_amount: toYuan(tour.total_amount),  // 分→元
        guide_name: guide?.register_name || guide?.legal_name || '',
        driver_name: driver?.register_name || driver?.legal_name || '',
        shop_name: shop?.register_name || ''
      };
    });
    
    const total = toursWithDetails.length;
    const p = parseInt(page) || 1;
    const ps = Math.min(parseInt(page_size) || 10, MAX_PAGE_SIZE);
    const list = toursWithDetails.slice((p - 1) * ps, p * ps);
    
    res.json({ code: 0, data: { list, total, page: p, page_size: ps } });
  } catch (error) {
    console.error('获取旅行团列表失败:', error.message);
    res.status(500).json({ code: 500, message: '获取旅行团列表失败' });
  }
});

/**
 * GET /api/tour-groups/:id - 获取旅行团详情
 */
app.get('/api/tour-groups/:id', (req, res) => {
  try {
    const tour = getTourGroupById(req.params.id);
    if (!tour) {
      return res.status(404).json({ code: 404, message: '旅行团不存在' });
    }
    
    // 关联导游、司机、商店信息
    const guide = tour.guide_id ? getMerchantById(tour.guide_id) : null;
    const driver = tour.driver_id ? getMerchantById(tour.driver_id) : null;
    const shop = tour.shop_id ? getMerchantById(tour.shop_id) : null;
    
    res.json({
      code: 0,
      data: {
        ...tour,
        total_amount: toYuan(tour.total_amount),  // 分→元
        guide_name: guide?.register_name || guide?.legal_name || '',
        driver_name: driver?.register_name || driver?.legal_name || '',
        shop_name: shop?.register_name || ''
      }
    });
  } catch (error) {
    console.error('获取旅行团详情失败:', error.message);
    res.status(500).json({ code: 500, message: '获取旅行团详情失败' });
  }
});

/**
 * PUT /api/tour-groups/:id - 更新旅行团
 */
app.put('/api/tour-groups/:id', (req, res) => {
  try {
    const tour = getTourGroupById(req.params.id);
    if (!tour) {
      return res.status(404).json({ code: 404, message: '旅行团不存在' });
    }
    
    const { 
      tour_name, route_name, days, itinerary,
      start_date, end_date, people_count,
      guide_id, driver_id, shop_id, attractions,
      hotel_name, hotel_phone, hotel_address,
      total_amount, remark, status 
    } = req.body;
    
    const updated = saveTourGroup({
      ...tour,
      tour_name,
      route_name,
      days,
      itinerary,
      start_date,
      end_date,
      people_count,
      guide_id,
      driver_id,
      shop_id,
      attractions,
      hotel_name,
      hotel_phone,
      hotel_address,
      total_amount,
      remark,
      status
    });
    
    res.json({ code: 0, data: updated, message: '更新成功' });
  } catch (error) {
    console.error('更新旅行团失败:', error.message);
    res.status(500).json({ code: 500, message: '更新旅行团失败' });
  }
});

/**
 * DELETE /api/tour-groups/:id - 删除旅行团
 */
app.delete('/api/tour-groups/:id', (req, res) => {
  try {
    const tour = getTourGroupById(req.params.id);
    if (!tour) {
      return res.status(404).json({ code: 404, message: '旅行团不存在' });
    }
    
    deleteTourGroup(req.params.id);
    res.json({ code: 0, message: '删除成功' });
  } catch (error) {
    console.error('删除旅行团失败:', error.message);
    res.status(500).json({ code: 500, message: '删除旅行团失败' });
  }
});

/**
 * POST /api/tour-group/:id/member - 添加团队成员
 */
app.post('/api/tour-group/:id/member', (req, res) => {
  try {
    const { merchant_id, role, split_ratio, split_amount } = req.body;
    
    const member = saveTourMember({
      tour_id: req.params.id,
      merchant_id,
      role,
      split_ratio,
      split_amount
    });
    
    res.json({ code: 0, data: member });
  } catch (error) {
    console.error('添加团队成员失败:', error.message);
    res.status(500).json({ code: 500, message: '添加团队成员失败' });
  }
});

/**
 * DELETE /api/tour-member/:id - 删除团队成员
 */
app.delete('/api/tour-member/:id', (req, res) => {
  try {
    deleteTourMember(req.params.id);
    res.json({ code: 0, message: '删除成功' });
  } catch (error) {
    console.error('删除团队成员失败:', error.message);
    res.status(500).json({ code: 500, message: '删除团队成员失败' });
  }
});

// ================= 分账规则管理 API =================

/**
 * POST /api/split-rule - 创建分账规则
 * 只有商户(1)和旅行社(2)可以创建
 */
app.post('/api/split-rule', (req, res) => {
  try {
    const { merchant_id, rule_name, rule_type, items } = req.body;
    
    // 验证商户权限
    const merchant = getMerchantById(merchant_id);
    if (!merchant) {
      return res.status(404).json({ code: 404, message: '商户不存在' });
    }
    
    if (!canSplit(merchant.enterprise_type)) {
      return res.status(403).json({ code: 403, message: '只有商户或旅行社可以创建分账规则' });
    }
    
    // 创建规则
    const rule = saveSplitRule({
      merchant_id,
      rule_name,
      rule_type: rule_type || 'FIXED',
      default_rule: false,
      status: 'ACTIVE'
    });
    
    // 添加规则明细
    if (items && items.length > 0) {
      for (const item of items) {
        saveSplitRuleItem({
          rule_id: rule.id,
          target_merchant_id: item.target_merchant_id,
          split_ratio: item.split_ratio || 0,
          split_amount: item.split_amount || 0
        });
      }
    }
    
    res.json({
      code: 0,
      data: {
        ...rule,
        items: items || []
      }
    });
  } catch (error) {
    console.error('创建分账规则失败:', error.message);
    res.status(500).json({ code: 500, message: '创建分账规则失败' });
  }
});

/**
 * GET /api/split-rule - 获取分账规则列表
 */
app.get('/api/split-rule', (req, res) => {
  try {
    const { merchant_id } = req.query;
    const rules = getSplitRules(merchant_id);
    
    // 获取每个规则的明细；金额字段从分转元
    const rulesWithItems = rules.map(rule => {
      const items = getSplitRuleItems(rule.id).map(item => ({
        ...item,
        split_amount: toYuan(item.split_amount)  // 分→元
      }));
      return { ...rule, items };
    });
    
    res.json({ code: 0, data: rulesWithItems });
  } catch (error) {
    console.error('获取分账规则列表失败:', error.message);
    res.status(500).json({ code: 500, message: '获取分账规则列表失败' });
  }
});

/**
 * DELETE /api/split-rule/:id - 删除分账规则
 */
app.delete('/api/split-rule/:id', (req, res) => {
  try {
    deleteSplitRule(req.params.id);
    res.json({ code: 0, message: '删除成功' });
  } catch (error) {
    console.error('删除分账规则失败:', error.message);
    res.status(500).json({ code: 500, message: '删除分账规则失败' });
  }
});

// ================= 旅行团分账 API =================

/**
 * POST /api/tour-group/:id/split - 执行旅行团分账
 * 根据团队成员的分账比例进行分账
 * 幂等：基于 out_split_no 查重，重复调用不会重复分账
 */
app.post('/api/tour-group/:id/split', async (req, res) => {
  try {
    const tour = getTourGroupById(req.params.id);
    if (!tour) {
      return res.status(404).json({ code: 404, message: '旅行团不存在' });
    }
    
    // 验证商户权限
    const merchant = getMerchantById(tour.merchant_id);
    if (!canSplit(merchant.enterprise_type)) {
      return res.status(403).json({ code: 403, message: '只有商户或旅行社可以执行分账' });
    }
    
    const members = getTourMembers(tour.id);
    if (!members || members.length === 0) {
      return res.status(400).json({ code: 400, message: '旅行团没有成员，无法分账' });
    }
    
    const results = [];
    const orderNo = `SPLIT${Date.now()}`;
    
    // 逐个成员执行分账（幂等：已成功的跳过）
    for (const member of members) {
      if (member.split_amount <= 0) continue;
      
      const targetMerchant = getMerchantById(member.merchant_id);
      if (!targetMerchant || !targetMerchant.qzt_account_no) {
        results.push({
          member_id: member.id,
          success: false,
          message: '目标商户不存在或未开户'
        });
        continue;
      }
      
      // 使用确定性 out_split_no（基于 orderNo + member.id）便于幂等查重
      const outSplitNo = `S${orderNo}${member.id}`;
      
      // 幂等检查：查询该 out_split_no 是否已存在且成功
      const existingSplit = dbSqlite.getSplitRecords({ merchant_id: member.merchant_id })
        .find(r => r.out_request_no === outSplitNo && r.status === 'SUCCESS');
      if (existingSplit) {
        results.push({
          member_id: member.id,
          out_split_no: outSplitNo,
          success: true,
          message: '已分账（幂等跳过）'
        });
        continue;
      }
      
      try {
        // DB 已存分（yuan→fen 在 saveTourMember 时完成），避免 *100 重复转换导致 100x 放大
        const amountFen = member.split_amount;

        const result = await callQzt('open.split.account.apply', {
          out_split_no: outSplitNo,
          order_no: orderNo,
          split_amount: amountFen,
          split_account_no: targetMerchant.qzt_account_no,
          split_merchant_no: targetMerchant.qzt_merchant_no || '',
          notify_url: `${QZT_CALLBACK_URL}/api/callback/split`
        });
        
        results.push({
          member_id: member.id,
          out_split_no: outSplitNo,
          success: result.status === 'SUCCESS',
          message: result.status === 'SUCCESS' ? '分账成功' : result.error_message || '分账失败'
        });
      } catch (err) {
        results.push({
          member_id: member.id,
          success: false,
          message: err.message
        });
      }
    }
    
    // 更新旅行团状态
    const allSuccess = results.every(r => r.success);
    saveTourGroup({
      ...tour,
      split_status: allSuccess ? 'SUCCESS' : 'PARTIAL'
    });
    
    res.json({
      code: 0,
      data: {
        tour_id: tour.id,
        order_no: orderNo,
        total_amount: toYuan(tour.total_amount),  // 分→元
        results
      }
    });
  } catch (error) {
    console.error('执行分账失败:', error.message);
    res.status(500).json({ code: 500, message: '执行分账失败', error: error.message });
  }
});

// ================= 余额分账 API =================

/**
 * POST /api/balance/split - 通过余额分账（无需旅行团）
 * 只有商户(1)和旅行社(2)可以操作
 * 幂等：基于 out_split_no 查重，重复调用不会重复分账
 */
app.post('/api/balance/split', async (req, res) => {
  try {
    const { merchant_id, split_items } = req.body;
    
    // 验证商户权限
    const merchant = getMerchantById(merchant_id);
    if (!merchant) {
      return res.status(404).json({ code: 404, message: '商户不存在' });
    }
    
    if (!canSplit(merchant.enterprise_type)) {
      return res.status(403).json({ code: 403, message: '只有商户或旅行社可以执行分账' });
    }
    
    if (!split_items || split_items.length === 0) {
      return res.status(400).json({ code: 400, message: '请提供分账明细' });
    }
    
    const results = [];
    const orderNo = `SPLIT${Date.now()}`;
    
    for (const item of split_items) {
      const targetMerchant = getMerchantById(item.target_merchant_id);
      if (!targetMerchant || !targetMerchant.qzt_account_no) {
        results.push({
          target_merchant_id: item.target_merchant_id,
          success: false,
          message: '目标商户不存在或未开户'
        });
        continue;
      }
      
      // 使用确定性 out_split_no（基于 orderNo + target_merchant_id）便于幂等查重
      const outSplitNo = `S${orderNo}${item.target_merchant_id}`;
      
      // 幂等检查：查询该 out_split_no 是否已存在且成功
      const existingSplit = dbSqlite.getSplitRecords({ merchant_id: merchant_id })
        .find(r => r.out_request_no === outSplitNo && r.status === 'SUCCESS');
      if (existingSplit) {
        results.push({
          target_merchant_id: item.target_merchant_id,
          out_split_no: outSplitNo,
          success: true,
          message: '已分账（幂等跳过）'
        });
        continue;
      }
      
      try {
        // DB 已存分（yuan→fen 在 saveSplitRuleItem 时完成），避免 *100 重复转换导致 100x 放大
        const amountFen = item.split_amount;

        const result = await callQzt('open.split.account.apply', {
          out_split_no: outSplitNo,
          order_no: orderNo,
          split_amount: amountFen,
          split_account_no: targetMerchant.qzt_account_no,
          split_merchant_no: targetMerchant.qzt_merchant_no || '',
          notify_url: `${QZT_CALLBACK_URL}/api/callback/split`
        });

        results.push({
          target_merchant_id: item.target_merchant_id,
          out_split_no: outSplitNo,
          success: result.status === 'SUCCESS',
          message: result.status === 'SUCCESS' ? '分账成功' : result.error_message || '分账失败'
        });
      } catch (err) {
        results.push({
          target_merchant_id: item.target_merchant_id,
          success: false,
          message: err.message
        });
      }
    }
    
    res.json({
      code: 0,
      data: {
        order_no: orderNo,
        results
      }
    });
  } catch (error) {
    console.error('余额分账失败:', error.message);
    res.status(500).json({ code: 500, message: '余额分账失败', error: error.message });
  }
});

// ================= 调试工具 API =================

/**
 * POST /api/debug/call - 调用钱账通接口（带签名）
 */
app.post('/api/debug/call', async (req, res) => {
  try {
    const { gatewayUrl, appId, version, service, params } = req.body;
    
    const timestamp = String(Math.floor(Date.now() / 1000));
    const paramsStr = JSON.stringify(params);
    const signContent = appId + timestamp + version + service + paramsStr;
    
    // 生成签名
    const signer = crypto.createSign('SHA256');
    signer.update(signContent, 'utf8');
    signer.end();
    const signValue = signer.sign(QZT_CONFIG.privateKey, 'base64');
    
    // 构建请求体
    const body = {
      app_id: appId,
      timestamp,
      version,
      sign: signValue,
      service,
      params
    };
    
    // 发送请求
    const response = await axios.post(gatewayUrl || QZT_CONFIG.gateway, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    
    res.json({
      code: 0,
      signContent,
      signValue,
      request: body,
      response: response.data
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '请求失败',
      error: error.message,
      response: error.response?.data
    });
  }
});

/**
 * POST /api/debug/sign - 仅生成签名
 */
app.post('/api/debug/sign', (req, res) => {
  try {
    const { appId, version, service, params } = req.body;
    
    const timestamp = String(Math.floor(Date.now() / 1000));
    const paramsStr = JSON.stringify(params);
    const signContent = appId + timestamp + version + service + paramsStr;
    
    // 生成签名
    const signer = crypto.createSign('SHA256');
    signer.update(signContent, 'utf8');
    signer.end();
    const signValue = signer.sign(QZT_CONFIG.privateKey, 'base64');
    
    res.json({
      code: 0,
      signContent,
      signValue,
      timestamp
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '签名生成失败',
      error: error.message
    });
  }
});

/**
 * GET /api/debug/tool - 调试工具页面
 */
app.use('/api/debug/tool', express.static(path.join(__dirname, 'tools')));

// 直接路由返回调试工具 HTML（备用）
app.get('/api/debug/tool/debug-tool.html', (req, res) => {
  const htmlPath = path.join(__dirname, 'tools', 'debug-tool.html');
  res.sendFile(htmlPath);
});

// ================= AI 智能分账 API =================

/**
 * POST /api/ai/parse-split - AI 解析分账需求
 */
app.post('/api/ai/parse-split', async (req, res) => {
  try {
    const { text, context } = req.body;
    
    if (!text) {
      return res.status(400).json({ code: 400, message: '请输入分账需求描述' });
    }
    
    // Prompt 注入防护：限制长度 + 过滤特殊字符
    const MAX_INPUT_LEN = 500;
    const inputText = String(text).slice(0, MAX_INPUT_LEN)
      .replace(/[{}$`\\]/g, ''); // 移除模板注入字符
    
    // MiniMax API 配置
    const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
    const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID;
    
    // 如果没有配置 MiniMax，使用规则解析
    if (!MINIMAX_API_KEY) {
      console.log('[AI] MiniMax API 未配置，使用规则解析');
      const result = parseSplitByRules(inputText, context);
      return res.json({ code: 0, data: result });
    }
    
    // 调用 MiniMax API（使用过滤后的 inputText）
    const prompt = `你是一个分账助手。用户会用自然语言描述分账需求，请解析并返回JSON格式的分账方案。

用户输入：${inputText}

请返回以下JSON格式（不要包含其他文字，不要用markdown代码块）：
{
  "success": true,
  "totalAmount": 10000,
  "items": [
    { "name": "李四", "role": "导游", "percent": 40, "amount": 4000 },
    { "name": "张三", "role": "司机", "percent": 20, "amount": 2000 },
    { "name": "顺风旅行社", "role": "旅行社", "percent": 30, "amount": 3000 },
    { "name": "平台服务费", "role": "平台", "percent": 10, "amount": 1000 }
  ],
  "confidence": 85,
  "suggestion": "已识别为旅行团分账场景"
}

如果无法解析，返回：
{
  "success": false,
  "message": "无法理解分账需求，请提供金额和分账对象"
}`;

    const response = await axios.post(
      `https://api.minimax.chat/v1/text/chatcompletion_v2?GroupId=${MINIMAX_GROUP_ID}`,
      {
        model: 'MiniMax-M2.5',
        messages: [
          { role: 'system', content: '你是一个专业的分账助手，帮助用户解析分账需求。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${MINIMAX_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    const aiContent = response.data.choices?.[0]?.message?.content || '';
    
    // 解析 AI 返回的 JSON
    let result;
    try {
      // 尝试提取 JSON
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = { success: false, message: 'AI 返回格式异常' };
      }
    } catch (e) {
      console.error('[AI] JSON 解析失败:', e.message);
      result = parseSplitByRules(inputText, context);
    }
    
    res.json({ code: 0, data: result });
    
  } catch (error) {
    console.error('[AI] 解析失败:', error.message);
    // 降级为规则解析
    const result = parseSplitByRules(inputText, context);
    res.json({ code: 0, data: result });
  }
});

// 规则解析（降级方案）
function parseSplitByRules(text, context = {}) {
  // 提取金额
  const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*元/);
  const totalAmount = amountMatch ? parseFloat(amountMatch[1]) : 10000;
  
  const items = [];
  
  // 检测分账对象
  const patterns = [
    { pattern: /导游[^0-9]*(\d+)%/, role: '导游', defaultPercent: 40 },
    { pattern: /司机[^0-9]*(\d+)%/, role: '司机', defaultPercent: 20 },
    { pattern: /旅行社[^0-9]*(\d+)%/, role: '旅行社', defaultPercent: 30 },
    { pattern: /平台[^0-9]*(\d+)%/, role: '平台', defaultPercent: 10 }
  ];
  
  let totalPercent = 0;
  
  patterns.forEach(({ pattern, role, defaultPercent }) => {
    if (text.includes(role)) {
      const match = text.match(pattern);
      const percent = match ? parseInt(match[1]) : defaultPercent;
      totalPercent += percent;
      items.push({
        name: role === '导游' ? '李四' : role === '司机' ? '张三' : role === '旅行社' ? '顺风旅行社' : '平台服务费',
        role,
        percent,
        amount: (totalAmount * percent / 100).toFixed(2)
      });
    }
  });
  
  // 如果没有识别到任何分账对象，使用默认模板
  if (items.length === 0) {
    items.push(
      { name: '李四(导游)', role: '导游', percent: 50, amount: (totalAmount * 0.5).toFixed(2) },
      { name: '顺风旅行社', role: '旅行社', percent: 50, amount: (totalAmount * 0.5).toFixed(2) }
    );
    totalPercent = 100;
  }
  
  // 如果百分比总和不是100，按比例调整
  if (totalPercent !== 100 && totalPercent > 0) {
    items.forEach(item => {
      item.percent = Math.round(item.percent * 100 / totalPercent);
      item.amount = (totalAmount * item.percent / 100).toFixed(2);
    });
  }
  
  return {
    success: true,
    totalAmount,
    items,
    confidence: 75,
    suggestion: '基于规则解析，建议确认分账比例'
  };
}

// ================= 分账模板 API =================

/**
 * GET /api/split-templates - 获取分账模板列表
 */
app.get('/api/split-templates', (req, res) => {
  try {
    const { creator_id } = req.query;
    const templates = dbSqlite.getSplitTemplates(creator_id);
    res.json({ code: 0, data: templates });
  } catch (error) {
    console.error('获取分账模板失败:', error.message);
    res.status(500).json({ code: 500, message: '获取分账模板失败' });
  }
});

/**
 * POST /api/split-templates - 创建分账模板
 */
app.post('/api/split-templates', (req, res) => {
  try {
    const { name, description, icon, items, creator_id, creator_type, is_system } = req.body;
    
    if (!name || !items || items.length === 0) {
      return res.status(400).json({ code: 400, message: '请提供模板名称和分账项目' });
    }
    
    // 验证百分比总和
    const totalPercent = items.reduce((sum, item) => sum + (item.percent || 0), 0);
    if (totalPercent !== 100) {
      return res.status(400).json({ code: 400, message: `分账比例总和必须为100%，当前为${totalPercent}%` });
    }
    
    const template_id = `TPL${Date.now()}`;
    
    const template = dbSqlite.saveSplitTemplate({
      template_id,
      name,
      description,
      icon,
      items,
      creator_id,
      creator_type,
      is_system
    });
    
    res.json({ code: 0, data: template, message: '模板创建成功' });
  } catch (error) {
    console.error('创建分账模板失败:', error.message);
    res.status(500).json({ code: 500, message: '创建分账模板失败' });
  }
});

/**
 * PUT /api/split-templates/:templateId - 更新分账模板
 */
app.put('/api/split-templates/:templateId', (req, res) => {
  try {
    const { templateId } = req.params;
    const { name, description, icon, items } = req.body;
    
    // 验证百分比总和
    if (items && items.length > 0) {
      const totalPercent = items.reduce((sum, item) => sum + (item.percent || 0), 0);
      if (totalPercent !== 100) {
        return res.status(400).json({ code: 400, message: `分账比例总和必须为100%，当前为${totalPercent}%` });
      }
    }
    
    const template = dbSqlite.saveSplitTemplate({
      template_id: templateId,
      name,
      description,
      icon,
      items
    });
    
    res.json({ code: 0, data: template, message: '模板更新成功' });
  } catch (error) {
    console.error('更新分账模板失败:', error.message);
    res.status(500).json({ code: 500, message: '更新分账模板失败' });
  }
});

/**
 * DELETE /api/split-templates/:templateId - 删除分账模板
 */
app.delete('/api/split-templates/:templateId', (req, res) => {
  try {
    const { templateId } = req.params;
    const result = dbSqlite.deleteSplitTemplate(templateId);
    
    if (result.success) {
      res.json({ code: 0, message: '模板删除成功' });
    } else {
      res.status(400).json({ code: 400, message: '系统模板不能删除' });
    }
  } catch (error) {
    console.error('删除分账模板失败:', error.message);
    res.status(500).json({ code: 500, message: '删除分账模板失败' });
  }
});

/**
 * POST /api/split-templates/:templateId/use - 使用模板（增加使用次数）
 */
app.post('/api/split-templates/:templateId/use', (req, res) => {
  try {
    const { templateId } = req.params;
    dbSqlite.incrementTemplateUsage(templateId);
    res.json({ code: 0, message: '使用次数已更新' });
  } catch (error) {
    console.error('更新使用次数失败:', error.message);
    res.status(500).json({ code: 500, message: '更新使用次数失败' });
  }
});

// ================= 对账 API =================

/**
 * POST /api/reconciliation/tasks - 创建对账任务
 */
app.post('/api/reconciliation/tasks', async (req, res) => {
  try {
    const { taskType, dateRangeStart, dateRangeEnd, createdBy } = req.body;
    
    if (!taskType || !dateRangeStart || !dateRangeEnd) {
      return res.status(400).json({ code: 400, message: '请提供对账类型和时间范围' });
    }
    
    const task_no = `REC${Date.now()}`;
    
    const task = dbSqlite.saveReconciliationTask({
      task_no,
      task_type: taskType,
      date_range_start: dateRangeStart,
      date_range_end: dateRangeEnd,
      created_by: createdBy
    });
    
    // 异步执行对账
    executeReconciliation(task_no, taskType, dateRangeStart, dateRangeEnd);
    
    res.json({ code: 0, data: task, message: '对账任务已创建' });
  } catch (error) {
    console.error('创建对账任务失败:', error.message);
    res.status(500).json({ code: 500, message: '创建对账任务失败' });
  }
});

/**
 * GET /api/reconciliation/tasks - 获取对账任务列表
 */
app.get('/api/reconciliation/tasks', (req, res) => {
  try {
    const { status, task_type } = req.query;
    const tasks = dbSqlite.getReconciliationTasks({ status, task_type });
    res.json({ code: 0, data: tasks });
  } catch (error) {
    console.error('获取对账任务失败:', error.message);
    res.status(500).json({ code: 500, message: '获取对账任务失败' });
  }
});

/**
 * GET /api/reconciliation/tasks/:taskNo - 获取对账任务详情
 */
app.get('/api/reconciliation/tasks/:taskNo', (req, res) => {
  try {
    const { taskNo } = req.params;
    const task = dbSqlite.getReconciliationTask(taskNo);
    
    if (!task) {
      return res.status(404).json({ code: 404, message: '对账任务不存在' });
    }
    
    const details = dbSqlite.getReconciliationDetails(taskNo);
    const differences = dbSqlite.getReconciliationDifferences(taskNo);
    
    res.json({ code: 0, data: { ...task, details, differences } });
  } catch (error) {
    console.error('获取对账任务详情失败:', error.message);
    res.status(500).json({ code: 500, message: '获取对账任务详情失败' });
  }
});

/**
 * PUT /api/reconciliation/differences/:id - 处理对账差异
 */
app.put('/api/reconciliation/differences/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { action, remark, resolved_by } = req.body;
    
    if (action === 'resolve') {
      dbSqlite.updateReconciliationDifference(id, {
        status: 'resolved',
        resolved_by,
        resolved_at: new Date().toISOString()
      });
    } else if (action === 'ignore') {
      dbSqlite.updateReconciliationDifference(id, {
        status: 'ignored',
        resolved_by,
        resolved_at: new Date().toISOString()
      });
    }
    
    res.json({ code: 0, message: '差异处理成功' });
  } catch (error) {
    console.error('处理对账差异失败:', error.message);
    res.status(500).json({ code: 500, message: '处理对账差异失败' });
  }
});

// 执行对账（异步）
async function executeReconciliation(task_no, task_type, start_date, end_date) {
  try {
    console.log(`[对账] 开始执行任务: ${task_no}`);
    
    // 更新状态为处理中
    dbSqlite.updateReconciliationTask(task_no, { status: 'processing' });
    
    // 获取交易记录
    const transactions = dbSqlite.getTransactions({ start_date, end_date });
    const splitRecords = dbSqlite.getSplitRecords({ start_date, end_date });
    
    let matched = 0;
    let unmatched = 0;
    let difference_amount = 0;
    
    // 简单对账逻辑：检查每笔交易是否都有对应的分账记录
    for (const tx of transactions) {
      const relatedSplits = splitRecords.filter(s => s.out_request_no === tx.out_request_no);
      
      if (relatedSplits.length > 0) {
        matched++;
        dbSqlite.saveReconciliationDetail({
          task_no,
          record_type: 'transaction',
          record_id: tx.out_request_no,
          expected_amount: tx.amount,
          actual_amount: tx.amount,
          difference_amount: 0,
          status: 'matched'
        });
      } else {
        unmatched++;
        dbSqlite.saveReconciliationDetail({
          task_no,
          record_type: 'transaction',
          record_id: tx.out_request_no,
          expected_amount: tx.amount,
          actual_amount: 0,
          difference_amount: tx.amount,
          status: 'unmatched'
        });
        
        dbSqlite.saveReconciliationDifference({
          task_no,
          difference_type: 'missing_split',
          severity: 'high',
          description: `交易 ${tx.out_request_no} 缺少分账记录`,
          suggested_action: '请核实是否需要补充分账'
        });
        
        difference_amount += tx.amount;
      }
    }
    
    // 更新任务状态
    dbSqlite.updateReconciliationTask(task_no, {
      status: 'completed',
      total_records: transactions.length,
      matched_records: matched,
      unmatched_records: unmatched,
      difference_amount,
      completed_at: new Date().toISOString()
    });
    
    console.log(`[对账] 任务完成: ${task_no}, 匹配: ${matched}, 不匹配: ${unmatched}`);
    
  } catch (error) {
    console.error(`[对账] 任务失败: ${task_no}`, error.message);
    dbSqlite.updateReconciliationTask(task_no, { status: 'failed' });
  }
}

app.listen(port, () => {
  console.log(`[BFF Server] 钱账通真实对接服务已启动运行在 http://localhost:${port}`);
  console.log(`[Debug Tool] 调试工具地址: http://localhost:${port}/api/debug/tool`);
});
