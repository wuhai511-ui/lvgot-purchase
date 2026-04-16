/**
 * 交易订单路由
 * GET  /api/orders        — 订单列表（平台查所有，商户查自己）
 * POST /api/orders        — 创建付款订单
 * GET  /api/orders/:id    — 订单详情
 * POST /api/orders/:id/splits — 手动分账（QZT 7.1）
 * POST /api/orders/batch  — 批量创建订单
 */
const express = require('express');
const router = express.Router();
const { callQzt } = require('../tools/qzt-service');
const dbSqlite = require('../db-sqlite');

// 订单列表
router.get('/', async (req, res) => {
  const { merchant_id, status, limit = 50, offset = 0 } = req.query;
  const orders = dbSqlite.getTradeOrders({
    merchant_id: merchant_id ? parseInt(merchant_id) : null,
    status,
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
  res.json({ code: 0, data: orders });
});

// 创建订单
router.post('/', async (req, res) => {
  const { merchant_id, out_order_no, account_no, payee_account_no, amount } = req.body;
  if (!out_order_no || !account_no || amount == null) {
    return res.status(400).json({ code: 400, message: '缺少必填参数：out_order_no, account_no, amount' });
  }
  const order = dbSqlite.saveTradeOrder({
    merchant_id: merchant_id || 0,
    out_order_no,
    account_no,
    payee_account_no: payee_account_no || '',
    amount: Math.round(parseFloat(amount)),
    status: 'PENDING',
  });
  res.json({ code: 0, data: order });
});

// 订单详情
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const order = dbSqlite.getTradeOrderById(parseInt(id));
  if (!order) return res.status(404).json({ code: 404, message: '订单不存在' });
  const payments = dbSqlite.getTradePaymentsByOrderId(parseInt(id));
  res.json({ code: 0, data: { ...order, payments } });
});

// 手动分账
router.post('/:id/splits', async (req, res) => {
  const { id } = req.params;
  const order = dbSqlite.getTradeOrderById(parseInt(id));
  if (!order) return res.status(404).json({ code: 404, message: '订单不存在' });

  const { payee_list } = req.body;
  if (!payee_list || !Array.isArray(payee_list)) {
    return res.status(400).json({ code: 400, message: '缺少 payee_list 参数（数组）' });
  }

  const outSplitNo = 'SP_' + Date.now();
  const result = await callQzt('trade.balance.split', {
    out_split_no: outSplitNo,
    account_no: order.account_no,
    amount: order.amount,
    payee_list,
  });

  // 保存分账记录
  dbSqlite.saveTradeSplit({
    payment_id: parseInt(id),
    split_amount: order.amount,
    split_account_no: order.account_no,
    status: 'PENDING',
  });

  res.json({ code: 0, data: { out_split_no: outSplitNo, result } });
});

// 批量创建订单
router.post('/batch', async (req, res) => {
  const { orders } = req.body;
  if (!Array.isArray(orders)) {
    return res.status(400).json({ code: 400, message: 'orders 必须是数组' });
  }
  const results = orders.map(o => {
    const autoOrderNo = 'ORD_' + Date.now() + Math.random().toString(36).slice(2, 8);
    const order = dbSqlite.saveTradeOrder({
      merchant_id: o.merchant_id || 0,
      out_order_no: o.out_order_no || autoOrderNo,
      account_no: o.account_no || '',
      payee_account_no: o.payee_account_no || '',
      amount: Math.round(parseFloat(o.amount || 0)),
      status: 'PENDING',
    });
    return { out_order_no: o.out_order_no || autoOrderNo, order };
  });
  res.json({ code: 0, data: results });
});

module.exports = router;