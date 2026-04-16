/**
 * 商终管理路由
 * GET  /api/terminals        — 商终列表（独立菜单）
 * POST /api/terminals/bind    — QZT 6.4 商终绑定
 * POST /api/terminals/:id/unbind — QZT 6.5 商终解绑 + 删除本地记录
 */
const express = require('express');
const router = express.Router();
const { callQzt } = require('../tools/qzt-service');
const dbSqlite = require('../db-sqlite');

// 商终列表（独立菜单）
router.get('/', async (req, res) => {
  const { store_id, merchant_id } = req.query;
  // getStoreTerminalsByStoreId 返回指定门店的商终；null/不传则返回全部
  const allTerminals = dbSqlite.getStoreTerminalsByStoreId(store_id ? parseInt(store_id) : null);
  const filtered = merchant_id
    ? allTerminals.filter(t => String(t.merchant_id) === String(merchant_id))
    : allTerminals;
  res.json({ code: 0, data: filtered });
});

// 商终绑定（QZT 6.4）
router.post('/bind', async (req, res) => {
  const { store_id, merchant_no, terminal_no, account_no } = req.body;
  if (!store_id || !merchant_no || !terminal_no) {
    return res.status(400).json({ code: 400, message: '缺少必填参数：store_id, merchant_no, terminal_no' });
  }

  const outRequestNo = 'BT_' + Date.now();
  const qztResult = await callQzt('terminal.bind', {
    out_request_no: outRequestNo,
    merchant_no,
    terminal_no,
    account_no: account_no || '',
  });

  // 保存本地记录
  dbSqlite.saveStoreTerminal(
    parseInt(store_id),
    merchant_no,
    terminal_no,
    account_no || '',
  );

  res.json({ code: 0, data: { out_request_no: outRequestNo, qzt_result: qztResult } });
});

// 商终解绑（QZT 6.5）
router.post('/:id/unbind', async (req, res) => {
  const { id } = req.params;
  const allTerminals = dbSqlite.getStoreTerminalsByStoreId(null);
  const terminal = allTerminals.find(t => String(t.id) === String(id));
  if (!terminal) {
    return res.status(404).json({ code: 404, message: '商终记录不存在' });
  }

  // 调用 QZT 6.5 解绑
  const outRequestNo = 'UB_' + Date.now();
  await callQzt('terminal.unbind', {
    out_request_no: outRequestNo,
    merchant_no: terminal.merchant_no,
    terminal_no: terminal.terminal_no,
  });

  // 删除本地记录（status → 'deleted'）
  dbSqlite.deleteStoreTerminal(id);

  res.json({ code: 0, message: '解绑成功' });
});

module.exports = router;