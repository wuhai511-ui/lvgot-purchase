/**
 * 门店管理路由
 * GET    /api/stores         — 门店列表
 * POST   /api/stores         — 创建门店
 * PUT    /api/stores/:id     — 更新门店
 * DELETE /api/stores/:id     — 删除门店（软删除）
 * GET    /api/stores/:id     — 门店详情（含商终列表）
 * GET    /api/stores/:id/terminals — 门店下的商终列表
 */
const express = require('express');
const router = express.Router();
const { callQzt } = require('../tools/qzt-service');
const dbSqlite = require('../db-sqlite');

// 门店列表
router.get('/', async (req, res) => {
  const { merchant_id } = req.query;
  const stores = dbSqlite.getStores(merchant_id ? parseInt(merchant_id) : null);
  res.json({ code: 0, data: stores });
});

// 创建门店
router.post('/', async (req, res) => {
  const { merchant_id, store_name } = req.body;
  if (!merchant_id || !store_name) {
    return res.status(400).json({ code: 400, message: '缺少必填参数：merchant_id, store_name' });
  }
  const store = dbSqlite.saveStore({ merchant_id: parseInt(merchant_id), store_name, status: 'ACTIVE' });
  res.json({ code: 0, data: store });
});

// 门店详情（含商终）
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const store = dbSqlite.getStoreById(parseInt(id));
  if (!store) return res.status(404).json({ code: 404, message: '门店不存在' });
  const terminals = dbSqlite.getStoreTerminalsByStoreId(parseInt(id));
  res.json({ code: 0, data: { ...store, terminals } });
});

// 更新门店
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { store_name, status } = req.body;
  const store = dbSqlite.saveStore({ id: parseInt(id), store_name, status });
  res.json({ code: 0, data: store });
});

// 删除门店（软删除）
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  dbSqlite.deleteStore(parseInt(id));
  res.json({ code: 0, message: '删除成功' });
});

// 门店下的商终列表
router.get('/:id/terminals', async (req, res) => {
  const { id } = req.params;
  const terminals = dbSqlite.getStoreTerminalsByStoreId(parseInt(id));
  res.json({ code: 0, data: terminals });
});

module.exports = router;