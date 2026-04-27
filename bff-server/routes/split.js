/**
 * 分账路由 — 申请 / 记录
 */
const express = require('express');
const { callQzt, parseQztResult, generateTransNo } = require('../qzt');

const MAX_PAGE_SIZE = 100;

module.exports = function ({ db, getSplitRecords, saveSplitRecord }) {
  const router = express.Router();

  // ========== 申请分账 ==========
  router.post('/apply', async (req, res) => {
    try {
      const { merchant_id, order_no, total_amount, split_amount, receiver_account, receiver_name, bank_account_no, remark } = req.body;
      const splitNo = order_no || generateTransNo();
      const amountFen = Math.round(parseFloat(split_amount) * 100);
      const QZT_CALLBACK_URL = 'http://bgualqb.cn/api';

      // 幂等检查
      const existingSplits = await getSplitRecords(merchant_id || 1, 1000, 0);
      const existing = existingSplits.find(r => r.out_request_no === splitNo && r.status === 'SUCCESS');
      if (existing) {
        return res.json({
          code: 0,
          data: { split_no: splitNo, status: 'SUCCESS', message: '已分账（幂等跳过）' }
        });
      }

      // 获取商户的钱账通账户号
      const merchants = await db.getMerchants();
      const merchant = merchants.find(m => String(m.id) === String(merchant_id));
      const account_no = merchant?.qzt_account_no || '7452174160891871232';

      const result = await callQzt('trans.trade.fund.split', {
        out_request_no: splitNo,
        account_no: account_no,
        split_type: '01',
        split_amount: String(amountFen),
        split_list: [{
          account_no: receiver_account,
          bank_account_no: bank_account_no || '',
          amount: String(amountFen),
          remark: remark || ''
        }],
        back_url: `${QZT_CALLBACK_URL}/api/split/callback`
      });

      const parsed = parseQztResult(result.result);

      await saveSplitRecord({
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
        data: { split_no: splitNo, status: parsed.status || 'PENDING', message: '分账申请已提交' }
      });
    } catch (error) {
      console.error('申请分账失败:', error.message);
      res.status(500).json({ code: 500, message: '申请分账失败', error: error.message });
    }
  });

  // ========== 分账记录 ==========
  router.get('/records', async (req, res) => {
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

  return router;
};