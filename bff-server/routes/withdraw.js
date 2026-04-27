/**
 * 提现路由 - 申请 / SMS确认 / 记录
 */
const express = require('express');
const { callQzt, parseQztResult, rsaEncrypt, generateTransNo } = require('../qzt');

const MAX_PAGE_SIZE = 100;


module.exports = function ({ db, getTransactions, saveTransaction }) {
  const router = express.Router();

  // ========== 申请提现（第一阶段：发起，触发短信）==========
  router.post('/apply', async (req, res) => {
    try {
      const { merchant_id, account_no, amount, bank_card_no, remark } = req.body;
      if (!account_no || !amount) {
        return res.status(400).json({ code: 400, message: '缺少必填参数: account_no, amount' });
      }

      const transactionNo = generateTransNo();
      const amountFen = Math.round(parseFloat(amount) * 100);

      // 从数据库获取商户信息，取 bank_account_no
      const merchants = await db.getMerchants();
      const merchant = merchants.find(m => String(m.id) === String(merchant_id));
      const bank_account_no = merchant?.qzt_response?.bank_card_no
        || merchant?.qzt_account_no
        || account_no;

      const result = await callQzt('account.balance.withdraw', {
        out_request_no: transactionNo,
        account_no,
        amount: String(amountFen),
        bank_account_no,
        bank_card_no: bank_card_no ? rsaEncrypt(bank_card_no) : undefined
      });

      const parsed = parseQztResult(result.result);

      await saveTransaction({
        merchant_id: merchant_id || 1,
        out_request_no: transactionNo,
        transaction_type: 'WITHDRAW',
        amount: amountFen,
        status: parsed.status || 'PENDING',
        remark: remark || '提现',
        qzt_response: parsed
      });

      res.json({
        code: 0,
        data: {
          transaction_no: transactionNo,
          out_request_no: transactionNo,
          withdraw_seq_no: parsed.withdraw_seq_no || parsed.seq_no || '',
          status: parsed.status || 'PENDING',
          sms_sent: true,
          message: '提现申请已提交，请输入短信验证码确认'
        }
      });
    } catch (error) {
      console.error('申请提现失败:', error.message);
      res.status(500).json({ code: 500, message: '申请提现失败', error: error.message });
    }
  });

  // ========== 提现确认（第二阶段：短信验证码）==========
  router.post('/confirm', async (req, res) => {
    try {
      const { out_request_no, account_no, withdraw_seq_no, sms_code } = req.body;

      const params = { out_request_no, sms_code };
      if (account_no) params.account_no = account_no;
      if (withdraw_seq_no) params.withdraw_seq_no = withdraw_seq_no;

      const result = await callQzt('account.balance.withdraw.confirm', params);
      const parsed = parseQztResult(result.result);

      if (out_request_no) {
        await saveTransaction({
          out_request_no,
          status: parsed.status || 'SUCCESS',
          qzt_response: parsed
        });
      }

      res.json({
        code: 0,
        data: {
          out_request_no,
          status: parsed.status || 'SUCCESS',
          message: parsed.status === 'FAILED' ? '提现失败' : '提现确认成功'
        }
      });
    } catch (error) {
      console.error('提现确认失败:', error.message);
      res.status(500).json({ code: 500, message: '提现确认失败', error: error.message });
    }
  });

  // ========== 提现记录 ==========
  router.get('/records', async (req, res) => {
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

  return router;
};
