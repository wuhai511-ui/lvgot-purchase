/**
 * 商户路由 — 开户 / OCR / 列表 / 详情 / 回调
 */
const express = require('express');
const { callQzt, parseQztResult, rsaEncrypt, toYuan, QZT_CALLBACK_URL, generateTransNo } = require('../qzt');
const { requireAuth } = require('../middleware/auth');

module.exports = function ({ db, getMerchants, saveMerchant, getMerchantByOutRequestNo, getMerchantById, getAccountsByMerchantId }) {
  const router = express.Router();

  // ========== 文件上传 ==========
  router.post('/upload', async (req, res) => {
    try {
      const { file_name, file_type, file_content } = req.body;
      const result = await callQzt('file.upload', { file_name, file_type, file_content });
      const parsed = parseQztResult(result.result);
      res.json({ code: 0, data: { file_key: parsed.file_key || parsed.fileKey || '' } });
    } catch (e) {
      res.status(500).json({ code: 500, message: '文件上传失败', error: e.message });
    }
  });

  // ========== 企业开户申请 ==========
  router.post('/apply', requireAuth, async (req, res) => {
    try {
      const { name, legal_mobile, legal_name, legal_id_card, license_no, enterprise_type, back_url, source, address, email } = req.body;
      const outRequestNo = generateTransNo();
      const entType = enterprise_type || '1';
      const defaultBackUrl = `${QZT_CALLBACK_URL}/api/merchant/callback?out_request_no=${outRequestNo}`;

      const result = await callQzt('open.pay.account.apply', {
        out_request_no: outRequestNo,
        register_name: name,
        legal_mobile,
        legal_name,
        legal_id_card: rsaEncrypt(legal_id_card),
        license_no: rsaEncrypt(license_no),
        enterprise_type: entType,
        address,
        email,
        back_url: back_url || defaultBackUrl
      });

      const parsed = parseQztResult(result.result);

      await saveMerchant({
        out_request_no: outRequestNo,
        register_name: name,
        legal_mobile: legal_mobile || null,
        legal_name: legal_name || null,
        legal_id_card: legal_id_card || null,
        license_no: license_no || null,
        enterprise_type: entType,
        address: address || null,
        email: email || null,
        back_url: back_url || defaultBackUrl,
        status: 'ENTERPRISE_PENDING',
        qzt_response: parsed
      });

      res.json({
        code: 0,
        data: {
          merchant_id: outRequestNo,
          out_request_no: outRequestNo,
          status: parsed.status || 'PENDING'
        }
      });
    } catch (e) {
      console.error('企业开户失败:', e.message);
      res.status(500).json({ code: 500, message: '商户开户失败', error: e.message });
    }
  });

  // ========== 商户详情 ==========
  router.get('/:id', async (req, res) => {
    const merchant = await getMerchantById(req.params.id);
    if (!merchant) return res.status(404).json({ code: 404, message: '商户不存在' });
    res.json({ code: 0, data: merchant });
  });

  // ========== 商户列表 ==========
  router.get('/', requireAuth, async (req, res) => {
    let merchants = await getMerchants();
    // 租户隔离
    const tenant_id = req.auth?.tenant_id;
    if (tenant_id) {
      merchants = merchants.filter(m => m.tenant_id === tenant_id);
    }
    res.json({ code: 0, data: merchants });
  });

  return router;
};
