/**
 * 银行卡路由 — 列表 / 绑定 / 解绑
 */
const express = require('express');
const { callQzt, parseQztResult, rsaEncrypt, maskCardNo, getBankName } = require('../qzt');

module.exports = function ({ db, getBankCardsByMerchantId, saveBankCard, deleteBankCard }) {
  const router = express.Router();

  // ========== 获取银行卡列表 ==========
  router.get('/', async (req, res) => {
    try {
      const { merchant_id } = req.query;
      const cards = await getBankCardsByMerchantId(merchant_id || 1);

      // 按 card_no 去重，保留最新的
      const cardMap = new Map();
      cards.forEach(c => {
        const key = c.bank_card_no || c.card_no;
        if (!cardMap.has(key)) {
          cardMap.set(key, c);
        }
      });

      const safeCards = Array.from(cardMap.values()).map(c => {
        const rawCardNo = c.bank_card_no || c.card_no;
        // 如果已经是脱敏卡号（包含****），直接使用；否则脱敏
        const isMasked = rawCardNo && rawCardNo.includes('****');
        return {
          id: c.id,
          card_no: isMasked ? rawCardNo : maskCardNo(rawCardNo),  // 真实卡号或脱敏卡号
          card_no_masked: isMasked ? rawCardNo : maskCardNo(rawCardNo),  // 脱敏卡号用于显示
          bank_name: c.bank_name,
          bank_code: c.bank_code,
          card_type: c.card_type,
          card_holder_name: c.card_holder_name,
          is_default: c.is_default,
          status: c.status,
          bind_time: c.bind_time
        };
      });

      res.json({ code: 0, data: safeCards });
    } catch (error) {
      console.error('获取银行卡列表失败:', error.message);
      res.status(500).json({ code: 500, message: '获取银行卡列表失败', error: error.message });
    }
  });

  // ========== 绑定银行卡 ==========
  router.post('/bind', async (req, res) => {
    try {
      const { merchant_id, account_no, bank_type, bank_code, bank_card_no, bank_card_name, bank_branch, bank_province, bank_city, bank_area } = req.body;

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

      const parsed = parseQztResult(result.result);

      if (parsed.bind_state === '00') {
        await saveBankCard({
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

  // ========== 解绑银行卡 ==========
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await deleteBankCard(id);
      res.json({ code: 0, message: '解绑成功' });
    } catch (error) {
      console.error('解绑银行卡失败:', error.message);
      res.status(500).json({ code: 500, message: '解绑银行卡失败', error: error.message });
    }
  });

  return router;
};