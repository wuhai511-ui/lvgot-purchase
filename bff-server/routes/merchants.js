/**
 * 商户管理路由（企业开户、银行内部户开户）
 *
 * POST /api/merchants/bank-internal-account    — 申请开立银行内部户（QZT 6.1）
 * GET  /api/merchants/bank-internal-account    — 查询银行户状态（QZT 6.12）
 *
 * 说明：支付账户开户（QZT 6.2）在 index.js 已有，本路由处理银行内部户相关
 */
const express = require('express');
const router = express.Router();
const { callQzt } = require('../tools/qzt-service');
const dbSqlite = require('../db-sqlite');

const QZT_CALLBACK_URL = process.env.QZT_CALLBACK_URL || 'https://test.wsmsd.cn';

/**
 * POST /api/merchants/bank-internal-account
 * 为已开户的商户（支付账户）申请开立银行内部户
 * 商户必须有有效的支付账户后才能申请银行内部户
 */
router.post('/bank-internal-account', async (req, res) => {
  const { merchant_id, register_name, legal_mobile, enterprise_type, back_url } = req.body;

  if (!merchant_id) {
    return res.status(400).json({ code: 400, message: '缺少 merchant_id' });
  }

  const merchant = dbSqlite.getMerchantById(parseInt(merchant_id));
  if (!merchant) return res.status(404).json({ code: 404, message: '商户不存在' });

  // 银行内部户仅对企业/个体工商户开放，个人商户不能开
  const entType = enterprise_type || merchant.enterprise_type;
  if (entType === 'PERSONAL' || entType === '3') {
    return res.status(400).json({ code: 400, message: '个人商户无需银行内部户' });
  }

  // 检查是否已有支付账户
  const accounts = dbSqlite.getAccountsByMerchantId(parseInt(merchant_id));
  if (!accounts.length) {
    return res.status(400).json({ code: 400, message: '请先完成支付账户开户（6.2）后再申请银行内部户' });
  }

  const outRequestNo = 'BA_' + Date.now();
  try {
    const result = await callQzt('open.bank.account.page.url', {
      out_request_no: outRequestNo,
      register_name: register_name || merchant.register_name || merchant.merchant_name,
      legal_mobile: legal_mobile || merchant.legal_mobile,
      enterprise_type: entType === 'ENTERPRISE' || entType === '1' ? '1' : '2',
      back_url: back_url || `${QZT_CALLBACK_URL}/api/merchants/callback/bank-internal?out_request_no=${outRequestNo}`,
    });

    // 记录开户申请
    dbSqlite.saveTransaction({
      merchant_id: parseInt(merchant_id),
      out_request_no: outRequestNo,
      transaction_type: 'BANK_INTERNAL_ACCOUNT_OPEN',
      amount: 0,
      status: 'PENDING',
      remark: '银行内部户开户申请',
      qzt_response: JSON.stringify(result),
    });

    res.json({ code: 0, data: { redirect_url: result.redirect_url || result.data?.redirect_url, out_request_no: outRequestNo } });
  } catch (err) {
    console.error('[bank-internal-account] 开户申请失败:', err.message);
    res.status(500).json({ code: 500, message: '银行内部户开户申请失败: ' + err.message });
  }
});

/**
 * GET /api/merchants/bank-internal-account
 * 查询银行户开户凭证/状态（QZT 6.12）
 * Query: out_request_no
 */
router.get('/bank-internal-account', async (req, res) => {
  const { out_request_no } = req.query;
  if (!out_request_no) return res.status(400).json({ code: 400, message: '缺少 out_request_no' });

  try {
    const result = await callQzt('open.bank.account.voucher.query', { out_request_no });
    res.json({ code: 0, data: result });
  } catch (err) {
    console.error('[bank-internal-account/query] 查询失败:', err.message);
    res.status(500).json({ code: 500, message: '查询失败: ' + err.message });
  }
});

module.exports = router;
