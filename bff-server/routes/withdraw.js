/**
 * 提现路由
 * POST /api/withdraw/apply     — 发起提现申请（QZT 7.3）
 * POST /api/withdraw/send-sms   — 发送短信验证码（QZT 7.5）
 * POST /api/withdraw/confirm   — 确认提现（QZT 7.6）
 * GET  /api/withdraw/records   — 提现记录
 */
const express = require('express');
const router = express.Router();
const { callQzt } = require('../tools/qzt-service');
const dbSqlite = require('../db-sqlite');

// 发起提现申请
router.post('/apply', async (req, res) => {
  const { account_no, amount, bank_card_no, remark } = req.body;
  if (!account_no || !amount) {
    return res.status(400).json({ code: 400, message: '缺少必填参数：account_no, amount' });
  }

  // 获取 account 对应的 merchant_id（修复评审意见：不用硬编码 0）
  const accounts = dbSqlite.getAccounts();
  const account = accounts.find(a => a.account_no === account_no);
  if (!account) return res.status(404).json({ code: 404, message: '账户不存在' });

  const merchant_id = account.merchant_id;
  const outRequestNo = 'WD_' + Date.now();
  const result = await callQzt('account.withdraw.apply', {
    out_request_no: outRequestNo,
    account_no,
    amount: Math.round(parseFloat(amount) * 100),
    bank_card_no: bank_card_no || '',
    remark: remark || '',
  });

  dbSqlite.saveTransaction({
    merchant_id,
    out_request_no: outRequestNo,
    transaction_type: 'WITHDRAW',
    amount: Math.round(parseFloat(amount) * 100),
    bank_card_no: bank_card_no || '',
    status: 'PENDING',
    qzt_response: JSON.stringify(result),
  });

  res.json({ code: 0, data: { out_request_no: outRequestNo, result } });
});

// 发送短信
router.post('/send-sms', async (req, res) => {
  const { out_request_no } = req.body;
  if (!out_request_no) return res.status(400).json({ code: 400, message: '缺少 out_request_no' });
  const result = await callQzt('account.withdraw.send.sms', { out_request_no });
  res.json({ code: 0, data: result });
});

// 确认提现
router.post('/confirm', async (req, res) => {
  const { out_request_no, sms_code } = req.body;
  if (!out_request_no || !sms_code) {
    return res.status(400).json({ code: 400, message: '缺少 out_request_no 或 sms_code' });
  }
  const result = await callQzt('account.withdraw.confirm', {
    out_request_no,
    sms_code,
  });
  res.json({ code: 0, data: result });
});

// 提现记录
router.get('/records', async (req, res) => {
  const { merchant_id, limit = 50, offset = 0 } = req.query;
  const txs = dbSqlite.getTransactions({
    merchant_id: merchant_id ? parseInt(merchant_id) : null,
    type: 'WITHDRAW',
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
  res.json({ code: 0, data: txs });
});

module.exports = router;