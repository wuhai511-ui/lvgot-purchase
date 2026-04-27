/**
 * 商终管理路由 — 查询 / 绑定 / 解绑
 */
const express = require('express');
const { callQzt, parseQztResult } = require('../qzt');

module.exports = function ({}) {
  const router = express.Router();

  // ========== 查询商终 ==========
  router.get('/', async (req, res) => {
    try {
      const { account_no, page = 1, page_size = 10 } = req.query;

      const result = await callQzt('merchant.terminal.query', {
        account_no,
        page: String(page),
        page_size: String(page_size)
      });

      const parsed = parseQztResult(result.result);

      res.json({
        code: 0,
        data: {
          list: parsed.list || [],
          total: parsed.total || 0
        }
      });
    } catch (error) {
      console.error('查询商终失败:', error.message);
      res.status(500).json({ code: 500, message: '查询商终失败', error: error.message });
    }
  });

  // ========== 绑定商终 ==========
  router.post('/bind', async (req, res) => {
    try {
      const { account_no, merchant_no, merchant_name } = req.body;

      const result = await callQzt('merchant.terminal.bind', {
        account_no,
        merchant_no,
        merchant_name
      });

      const parsed = parseQztResult(result.result);

      res.json({
        code: 0,
        data: {
          bind_state: parsed.bind_state,
          message: parsed.bind_state === '00' ? '绑定成功' : '绑定失败'
        }
      });
    } catch (error) {
      console.error('绑定商终失败:', error.message);
      res.status(500).json({ code: 500, message: '绑定商终失败', error: error.message });
    }
  });

  // ========== 解绑商终 ==========
  router.post('/unbind', async (req, res) => {
    try {
      const { account_no, merchant_no } = req.body;

      const result = await callQzt('merchant.terminal.unbind', {
        account_no,
        merchant_no
      });

      const parsed = parseQztResult(result.result);

      res.json({
        code: 0,
        data: {
          unbind_state: parsed.unbind_state || parsed.bind_state,
          message: '解绑成功'
        }
      });
    } catch (error) {
      console.error('解绑商终失败:', error.message);
      res.status(500).json({ code: 500, message: '解绑商终失败', error: error.message });
    }
  });

  return router;
};