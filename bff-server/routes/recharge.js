/**
 * 充值路由
 * POST /api/recharge/apply   — 发起充值（QZT 7.9）
 * GET  /api/recharge/status   — 查询充值状态（QZT 7.10）
 * GET  /api/recharge/records  — 充值记录列表
 */
const express = require('express');
const router = express.Router();
const { callQzt } = require('../tools/qzt-service');
const dbSqlite = require('../db-sqlite');

// 发起充值
router.post('/apply', async (req, res) => {
  const { account_no, amount, remark } = req.body;
  if (!account_no || !amount) {
    return res.status(400).json({ code: 400, message: '缺少必填参数：account_no, amount' });
  }

  const accounts = dbSqlite.getAccounts();
  const account = accounts.find(a => a.account_no === account_no);
  if (!account) return res.status(404).json({ code: 404, message: '账户不存在' });
  if (account.account_type === 'PERSONAL') {
    return res.status(400).json({ code: 400, message: '个人账户不支持充值' });
  }

  const merchant_id = account.merchant_id;
  const outRequestNo = 'RC_' + Date.now();
  const result = await callQzt('account.recharge', {
    out_request_no: outRequestNo,
    account_no,
    amount: Math.round(parseFloat(amount) * 100), // 转为分
    remark: remark || '',
  });

  // 记录本地
  dbSqlite.saveTransaction({
    merchant_id,
    out_request_no: outRequestNo,
    transaction_type: 'RECHARGE',
    amount: Math.round(parseFloat(amount) * 100),
    status: 'PENDING',
    qzt_response: JSON.stringify(result),
  });

  res.json({ code: 0, data: { out_request_no: outRequestNo, result } });
});

// 查询充值状态
router.get('/status', async (req, res) => {
  const { out_request_no } = req.query;
  if (!out_request_no) return res.status(400).json({ code: 400, message: '缺少 out_request_no' });
  const result = await callQzt('account.recharge.query', { out_request_no });
  res.json({ code: 0, data: result });
});

// 充值记录
router.get('/records', async (req, res) => {
  const { merchant_id, limit = 50, offset = 0 } = req.query;
  const txs = dbSqlite.getTransactions({
    merchant_id: merchant_id ? parseInt(merchant_id) : null,
    type: 'RECHARGE',
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
  res.json({ code: 0, data: txs });
});

module.exports = router;