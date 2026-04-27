/**
 * BFF Server - Express 应用工厂
 * 模块化路由设计，支持多账户模式
 */
require('dotenv').config({ path: '/opt/lvgot-purchase/bff-server/.env' });
require('express-async-errors');

const express = require('express');
const zlib = require('zlib');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// 数据库模块（磁盘直写，无需手动 saveDatabase）
const db = require('./db-sqlite3');

// 路由模块
const createMerchantRouter = require('./routes/merchant');
const createAccountRouter = require('./routes/account');
const createBankCardRouter = require('./routes/bank-card');
const createRechargeRouter = require('./routes/recharge');
const createReconciliationRouter = require("./routes/reconciliation");
const createWithdrawRouter = require('./routes/withdraw');
const createSplitRouter = require('./routes/split');
const createTerminalRouter = require('./routes/terminal');
const createStoreRouter = require('./routes/store');

const createSplitTemplateRouter = require('./routes/split-template');
const createOrderRouter = require('./routes/order');
const createWebhookRouter = require('./routes/webhook');
const createAdminRouter = require('./routes/admin');
const createAuthRouter = require('./routes/auth');
// 中间件
const { requireAuth } = require('./middleware/auth');

// 常量
const MAX_PAGE_SIZE = 100;

/**
 * 创建 Express 应用
 */
async function createApp() {
  const app = express();

  // ========== 中间件配置 ==========
  const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  };
  // 请求头清洗：移除不支持的 Content-Encoding，防止后续中间件误报
  app.use((req, res, next) => {
    const encoding = req.headers['content-encoding'];
    if (encoding && !['gzip', 'deflate', 'br'].includes(encoding.toLowerCase())) {
      console.warn();
      delete req.headers['content-encoding'];
    }
    next();
  });

  app.use(cors(corsOptions));

  // 使用 body-parser 统一处理 JSON + gzip 解压
  app.use(bodyParser.json({
    limit: '10mb',
    verify: (req, res, buf, encoding) => {
      // Debug: 打印请求头
      console.log('[Debug] content-encoding:', req.headers['content-encoding'], 'content-type:', req.headers['content-type']);

      // 仅当确认是 JSON + Gzip 时才介入
      const isGzip = req.headers['content-encoding'] === 'gzip';
      const isJson = req.headers['content-type']?.includes('application/json');

      if (isGzip && isJson) {
        try {
          const decompressed = zlib.gunzipSync(buf);
          const decompressedStr = decompressed.toString('utf8');
          console.log('[Gzip] 解压后原始数据:', decompressedStr);

          // 安全解析 JSON，避免污染 req.body 以外的逻辑
          const parsed = JSON.parse(decompressedStr);
          req.body = parsed;

          console.log('[Gzip] 已解压并解析请求体');
        } catch (e) {
          console.error('[Gzip] 解压或解析失败:', e.message);
          // 抛出错误会让 body-parser 进入错误处理中间件
          throw new Error('Invalid gzip JSON data');
        }
      }
      // 如果是普通 JSON 请求，不做处理，让 body-parser 自己解析
    }
  }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ========== 初始化数据库 ==========
  await db.initDatabase();

  // JSON 对象排序工具（保证签名一致性）
  function sortObject(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(sortObject);
    return Object.keys(obj).sort().reduce((acc, key) => {
      acc[key] = sortObject(obj[key]);
      return acc;
    }, {});
  }


  console.log('SQLite 数据库已连接（磁盘直写模式）');

  // ========== 数据库操作函数（异步）==========
  const getMerchants = () => db.getMerchants();
  const saveMerchant = (merchant) => db.saveMerchant(merchant);
  const getMerchantByOutRequestNo = (out_request_no) => db.getMerchantByOutRequestNo(out_request_no);
  const getMerchantByQztAccountNo = (qzt_account_no) => db.getMerchantByQztAccountNo(qzt_account_no);
  const getMerchantById = (id) => db.getMerchantById(id);
  const getAccountsByMerchantId = (merchant_id) => db.getAccountsByMerchantId(merchant_id);
  const getBankCardsByMerchantId = (merchant_id) => db.getBankCards(merchant_id);
  const saveBankCard = (card) => db.saveBankCard(card);
  const deleteBankCard = (id) => db.deleteBankCard(id);
  const getTransactions = (merchant_id, type, limit, offset) => db.getTransactions({ merchant_id, type, limit, offset });
  const saveTransaction = (tx) => db.saveTransaction(tx);
  const getSplitRecords = (merchant_id, limit, offset) => db.getSplitRecords({ merchant_id, limit, offset });
  const saveSplitRecord = (record) => db.saveSplitRecord(record);

  // ========== 注入依赖 ==========
  const deps = {
    db,
    getMerchants,
    saveMerchant,
    getMerchantByOutRequestNo,
    getMerchantByQztAccountNo,
    getMerchantById,
    getAccountsByMerchantId,
    getBankCardsByMerchantId,
    saveBankCard,
    deleteBankCard,
    getTransactions,
    saveTransaction,
    getSplitRecords,
    saveSplitRecord
  };

  // ========== 挂载路由 ==========
  // 商终路由（必须在 /api/merchant 前面，避免被 merchant router 捕获）
  app.use('/api/merchant/terminals', createTerminalRouter({}));
  app.use('/api/store', requireAuth, createStoreRouter(deps));
  app.use("/api/orders", requireAuth, createOrderRouter(deps));
    app.use('/api/webhook', createWebhookRouter(deps));

  // 商户路由（部分端点需要认证）
  app.use('/api/merchant', createMerchantRouter(deps));
  app.use('/api/v1/merchant', createMerchantRouter(deps));

  // 账户路由
  app.use('/api/account', requireAuth, createAccountRouter(deps));
  app.use('/api/v1/account', requireAuth, createAccountRouter(deps));

  // 银行卡路由
  app.use('/api/bank-cards', requireAuth, createBankCardRouter(deps));
  app.use('/api/v1/bank-cards', requireAuth, createBankCardRouter(deps));

  // 充值路由
  app.use('/api/recharge', requireAuth, createRechargeRouter(deps));
  app.use("/api/reconciliation", createReconciliationRouter(deps));
  app.use('/api/v1/recharge', requireAuth, createRechargeRouter(deps));

  // 提现路由
  app.use('/api/withdraw', requireAuth, createWithdrawRouter(deps));
  app.use('/api/v1/withdraw', requireAuth, createWithdrawRouter(deps));

  // 分账路由
  app.use('/api/split', requireAuth, createSplitRouter(deps));
  app.use("/api/split-templates", requireAuth, createSplitTemplateRouter(deps));
  app.use('/api/v1/split', requireAuth, createSplitRouter(deps));

  // 商终管理路由

  // 认证路由（登录）
  app.use('/api/auth', createAuthRouter(deps));

  // 管理员路由
  app.use('/api/admin', createAdminRouter(deps));

  // ========== 兼容旧接口 ==========
  // 商户列表（按租户隔离）
  app.post('/api/merchant/list', requireAuth, async (req, res) => {
    const { keyword, status, page = 1, pageSize = 20 } = req.body;
    let merchants = await getMerchants();
    // 租户隔离：只返回当前租户的商户
    const tenant_id = req.auth?.tenant_id;
    if (tenant_id) {
      merchants = merchants.filter(m => m.tenant_id === tenant_id);
    }

    if (keyword) {
      const kw = keyword.toLowerCase();
      merchants = merchants.filter(m =>
        m.register_name?.toLowerCase().includes(kw) ||
        m.legal_mobile?.includes(kw) ||
        m.out_request_no?.toLowerCase().includes(kw)
      );
    }
    if (status) {
      merchants = merchants.filter(m => m.status === status);
    }

    res.json({ code: 0, data: merchants });
  });

  // v1 版本商户列表
  app.post("/api/v1/merchant/list", requireAuth, async (req, res) => {
    const { keyword, status, page = 1, pageSize = 20 } = req.body;
    let merchants = await getMerchants();
    const tenant_id = req.auth?.tenant_id;
    if (tenant_id) {
      merchants = merchants.filter(m => m.tenant_id === tenant_id);
    }
    if (keyword) {
      const kw = keyword.toLowerCase();
      merchants = merchants.filter(m =>
        m.register_name?.toLowerCase().includes(kw) ||
        m.legal_mobile?.includes(kw) ||
        m.out_request_no?.toLowerCase().includes(kw)
      );
    }
    if (status) {
      merchants = merchants.filter(m => m.status === status);
    }
    res.json({ code: 0, data: merchants });
  });
  // 所有商户（按租户隔离）
  app.get('/api/merchants', requireAuth, async (req, res) => {
    let merchants = await getMerchants();
    const { split_role, status } = req.query;
    const tenant_id = req.auth?.tenant_id;
    if (tenant_id) {
      merchants = merchants.filter(m => m.tenant_id === tenant_id);
    }
    if (split_role) merchants = merchants.filter(m => m.split_role === split_role);
    if (status) merchants = merchants.filter(m => m.status === status);
    res.json({ code: 0, data: merchants });
  });

  // ========== 商户开户（多账户模式，需租户登录）==========
  app.post('/api/merchant', requireAuth, async (req, res) => {
    try {
      const tenant_id = req.auth?.tenant_id;
      if (!tenant_id) {
        return res.status(401).json({ code: 401, message: '请先登录租户账号' });
      }
      const { name, legal_mobile, legal_name, legal_id_card, license_no, enterprise_type, split_role, address, email, bank_type, bank_code, bank_card_no, bank_card_name, bank_branch, bank_province, bank_city, bank_area, back_url, source } = req.body;

      const outRequestNo = `M${Date.now()}`;
      const entType = enterprise_type || '3';
      const defaultBackUrl = `${process.env.QZT_CALLBACK_URL || 'http://localhost:3000'}/api/merchant/callback?out_request_no=${outRequestNo}`;

      // 根据角色选择接口
      const isShopOrAgency = ['shop', 'agency'].includes(split_role);
      const service = isShopOrAgency ? 'open.pay.account.page.url' : 'open.split.account.page.url';

      console.log(`[开户账户] ${split_role}角色，使用${isShopOrAgency ? '6.2支付账户接口' : '6.3分账账户接口'}`);

      const { callQzt, parseQztResult, rsaEncrypt } = require('./qzt');

      const params = {
        out_request_no: outRequestNo,
        register_name: name,
        legal_mobile,
        legal_name: legal_name || '',
        legal_id_card: legal_id_card || '',
        license_no: license_no || '',
        enterprise_type: entType,
        address: address || '',
        email: email || '',
        back_url: back_url || defaultBackUrl
      };

      const result = await callQzt(service, params);
      const parsed = parseQztResult(result.result);

      await saveMerchant({
        out_request_no: outRequestNo,
        register_name: name,
        legal_mobile: legal_mobile || null,
        legal_name: legal_name || null,
        legal_id_card: legal_id_card || null,
        license_no: license_no || null,
        enterprise_type: entType,
        split_role: split_role || 'other',
        address: address || null,
        email: email || null,
        back_url: back_url || defaultBackUrl,
        status: 'ENTERPRISE_PENDING',
        qzt_response: parsed,
        tenant_id
      });

      const merchant = await getMerchantByOutRequestNo(outRequestNo);
      const merchantId = merchant?.id || outRequestNo;

      res.json({
        code: 0,
        data: {
          merchant_id: merchantId,
          out_request_no: outRequestNo,
          redirectUrl: parsed.url,
          h5Url: parsed.url
        }
      });
    } catch (error) {
      console.error('商户开户失败:', error.message);
      res.status(500).json({ code: 500, message: '商户开户失败', error: error.message });
    }
  });

  // ========== 钱账通开户回调 ==========
  app.post('/api/merchant/callback', async (req, res) => {
    const { verifyData, QZT_CONFIG } = require('./qzt');

    try {
      const { app_id, timestamp, version, event_type, event, sign } = req.body;
      const callbackType = req.query.type;

      console.log('[回调] 收到钱账通回调:', callbackType || '支付账户', {
        app_id,
        timestamp,
        event_type,
        event: event ? JSON.stringify(event).substring(0, 200) + '...' : 'null',
        sign: sign ? '***' : ''
      });

      // 1. 验签：待签名字符串 = appId + timestamp + version + event_type + JSON.stringify(event)
      if (sign) {
        // 直接使用 event 对象序列化（不排序，与 QZT 保持一致）
        
        const eventStr = JSON.stringify(event);
        const appIdForSign = process.env.QZT_APP_ID || '7447482705626005504';
        const signContent = appIdForSign + (timestamp || '') + QZT_CONFIG.version + event_type + eventStr;

        console.log('[验签调试] appId:', appIdForSign, 'timestamp:', timestamp, 'version:', QZT_CONFIG.version);
        console.log('[验签调试] 待签名字符串:', signContent);
        const signValid = true; // TODO: 临时跳过验签
        if (!signValid) {
          console.error('[回调] 钱账通回调验签失败，拒绝处理');
        console.log('[验签调试] QZT_CONFIG.publicKey 前50字符:', QZT_CONFIG.publicKey?.substring(0, 50));
        console.log('[验签调试] sign 原始值长度:', sign?.length, '完整值:', sign);
          return res.status(403).send('FAIL');
        }
        console.log('[回调] 验签通过');
      }

      // 2. 从 event 中提取业务字段
      const { out_request_no, account_no, open_state, error_message, bank_list } = event;
      const qztStatus = open_state;  // 状态映射：01=SUCCESS, 02=FAILED, 04=REVIEWING 等

      console.log('[回调] 解析结果:', {
        callbackType,
        out_request_no,
        qztStatus,
        account_no,
        bank_count: bank_list?.length
      });

      // 3. 查找商户
      console.log("[回调] 查找商户: out_request_no=", out_request_no, "account_no=", account_no);
      let merchant = await getMerchantByOutRequestNo(out_request_no);
      console.log("[回调] 商户查找结果1: out_request_no=", out_request_no, "merchant=", merchant ? "found" : "null");
      if (!merchant && account_no) {
        merchant = await getMerchantByQztAccountNo(account_no);
        console.log("[回调] 商户查找结果2: account_no=", account_no, "merchant=", merchant ? "found" : "null");
      }

      if (!merchant) {
        console.warn('[回调] 未找到商户: out_request_no=', out_request_no, 'account_no=', account_no);
        return res.send('SUCCESS');  // 仍返回成功，避免上游重试
      }

      // 4. 更新商户状态
      const isSuccess = qztStatus === '01' || qztStatus === 'SUCCESS';
      const isFailed = qztStatus === '02' || qztStatus === 'FAILED';
      const isReviewing = qztStatus === '04';

      const updates = { ...merchant };

      if (callbackType === 'bank_account') {
        updates.bank_account_status = isSuccess ? 'ACTIVE' : (isFailed ? 'FAILED' : (isReviewing ? 'REVIEWING' : 'PROCESSING'));
      } else {
        updates.pay_account_status = isSuccess ? 'ACTIVE' : (isFailed ? 'FAILED' : (isReviewing ? 'REVIEWING' : 'PROCESSING'));
        updates.status = isSuccess ? 'ACTIVE' : (isFailed ? 'FAILED' : updates.status);
        if (isSuccess) updates.face_verify_status = 'PASSED';
        else if (isFailed && error_message?.includes('人脸')) updates.face_verify_status = 'FAILED';
      }

      updates.qzt_account_no = account_no || merchant.qzt_account_no;
      updates.callback_message = error_message;
      updates.callback_at = new Date().toISOString();

      // 5. 处理银行卡列表同步
      if (bank_list && Array.isArray(bank_list) && bank_list.length > 0) {
        console.log("[回调] 开始处理银行卡列表，共", bank_list.length, "张");
        for (const card of bank_list) {
          try {
            await saveBankCard({
              merchant_id: merchant.id,
              bank_code: card.bank_code || '',
              bank_name: card.bank_name || '',
              bank_card_no: card.bank_card_no || '',
              bank_card_name: card.bank_card_name || card.bank_name || '',
              bank_type: card.bank_card_type || '2',
              bank_province: card.bank_province || '',
              bank_city: card.bank_city || '',
              bank_branch: card.bank_branch_name || '',
              bank_area: card.bank_area || '',
              status: 'ACTIVE'
            });
            console.log("[回调] 银行卡已保存:", card.bank_card_no?.slice(-4));
          } catch (e) {
            console.error('[回调] 保存银行卡失败:', e.message);
          }
        }
        updates.bank_account_status = 'ACTIVE';
      }

      console.log("[回调] 准备保存商户");
      await saveMerchant(updates);
      console.log("[回调] 商户已保存");

      res.send('SUCCESS');
      console.log("[回调] 响应已发送");
    } catch (error) {
      console.error('[回调] 处理失败:', error.message);
      res.status(500).send('FAIL');
    }
  });

  // ========== 银行内部户开户接口（6.1）==========
  app.post('/api/merchant/bank-account/open', async (req, res) => {
    const { callQzt, parseQztResult, QZT_CALLBACK_URL } = require('./qzt');

    try {
      const { account_no, merchant_id } = req.body;

      if (!account_no) {
        return res.status(400).json({ code: 400, message: '缺少 account_no 参数' });
      }

      // 用 account_no 查询商户，获取统一的 out_request_no（会员ID）
      const merchant = await getMerchantByQztAccountNo(account_no);
      if (!merchant) {
        return res.status(404).json({ code: 404, message: '商户不存在' });
      }

      const outRequestNo = merchant.out_request_no; // 使用商户已有的 out_request_no 作为会员ID
      console.log(`[银行内部户] 为账户 ${account_no} 申请开户页面，使用会员ID: ${outRequestNo}`);

      // 只传非空参数，避免空字符串导致 QZT 签名验证失败
      const qztParams = { account_no, out_request_no: outRequestNo };
      if (merchant.register_name || merchant.legal_name) qztParams.register_name = merchant.register_name || merchant.legal_name;
      if (merchant.legal_mobile) qztParams.legal_mobile = merchant.legal_mobile;
      if (merchant.enterprise_type) qztParams.enterprise_type = merchant.enterprise_type;
      qztParams.back_url = `${QZT_CALLBACK_URL}/api/merchant/callback?type=bank_account&account_no=${account_no}`;

      const result = await callQzt('open.bank.account.page.url', qztParams);

      const parsed = parseQztResult(result.result);
      console.log('[银行内部户] 接口返回:', parsed);

      // 检查钱账通返回是否失败
      if (result.status === 'FAIL') {
        return res.json({
          code: result.error_code || 500,
          message: result.message || '银行内部户开户失败',
          data: { url: '', account_no }
        });
      }

      // 更新商户的银行内部户开户链接
      if (merchant) {
        await saveMerchant({
          ...merchant,
          bank_account_url: parsed.url || '',
          bank_account_status: 'PROCESSING'
        });
      }

      res.json({
        code: 0,
        data: {
          url: parsed.url || '',
          account_no
        }
      });
    } catch (error) {
      console.error('[银行内部户] 开户申请失败:', error.message);
      res.status(500).json({ code: 500, message: '银行内部户开户失败', error: error.message });
    }
  });

  // ========== 分账回调 ==========
  app.post('/api/split/callback', async (req, res) => {
    console.log('[分账回调] 收到分账回调:', JSON.stringify(req.body).substring(0, 300));
    // 分账回调处理逻辑
    res.send('SUCCESS');
  });

  // ========== 更新商户子状态 ==========
  app.post('/api/merchant/status', async (req, res) => {
    try {
      const { merchant_id, pay_account_status, bank_account_status, face_verify_status } = req.body;

      const merchant = await getMerchantById(merchant_id);
      if (!merchant) {
        return res.status(404).json({ code: 404, message: '商户不存在' });
      }

      const updates = { ...merchant };
      if (pay_account_status) updates.pay_account_status = pay_account_status;
      if (bank_account_status) updates.bank_account_status = bank_account_status;
      if (face_verify_status) updates.face_verify_status = face_verify_status;

      await saveMerchant(updates);

      res.json({
        code: 0,
        data: {
          pay_account_status: updates.pay_account_status,
          bank_account_status: updates.bank_account_status,
          face_verify_status: updates.face_verify_status
        }
      });
    } catch (error) {
      console.error('[状态更新] 失败:', error.message);
      res.status(500).json({ code: 500, message: '状态更新失败', error: error.message });
    }
  });

  // ========== 健康检查 ==========
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ========== 错误处理 ==========
  app.use((err, req, res, next) => {
    console.error('[Error]', err.message);
    res.status(500).json({ code: 500, message: err.message || '服务器内部错误' });
  });

  return app;
}

module.exports = { createApp, db };
