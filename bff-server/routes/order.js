const express = require('express')

module.exports = function (deps) {
  const router = express.Router()
  const { db, getMerchants } = deps

  // GET /api/orders - 获取订单列表（兼容旧接口）
  router.get('/', async (req, res) => {
    const { order_no, store_id, status, order_type, page = 1, page_size = 20 } = req.query
    try {
      // 获取所有数据
      let orders = await db.getOrders()
      
      // 按 order_type 过滤
      if (order_type) {
        orders = orders.filter(o => o.order_type === order_type)
      }
      
      let merchants = await getMerchants()
      let stores = await db.getStores()

      // 过滤
      if (order_no) {
        orders = orders.filter(o => o.order_no.includes(order_no))
      }
      if (store_id) {
        orders = orders.filter(o => o.store_id == store_id)
      }
      if (status) {
        orders = orders.filter(o => o.status === status)
      }

      // 获取旅行团
      const tourGroups = await db.getTourGroups()

      // 关联信息
      orders = orders.map(o => {
        const m = merchants.find(m => String(m.id) === String(o.merchant_id))
        const s = stores.find(s => s.id === o.store_id)
        const tg = tourGroups.find(tg => tg.id === o.tour_group_id)
        return {
          ...o,
          merchant_name: m?.register_name || '',
          store_name: s?.store_name || '',
          tour_group_name: tg?.group_name || ''
        }
      })

      const total = orders.length

      // 分页
      const offset = (parseInt(page) - 1) * parseInt(page_size)
      const list = orders.slice(offset, offset + parseInt(page_size))

      res.json({ code: 0, data: { list, total, page: parseInt(page), page_size: parseInt(page_size) } })
    } catch (e) {
      console.error('[订单列表] error:', e)
      res.json({ code: 1, message: e.message })
    }
  })

  // GET /api/orders/pay - 支付订单列表
  router.get('/pay', async (req, res) => {
    const { order_no, store_id, pay_status, split_status, page = 1, page_size = 20 } = req.query
    try {
      let orders = await db.getOrders()
      
      // 只查询支付订单
      orders = orders.filter(o => o.order_type === 'PAY')
      
      let merchants = await getMerchants()
      let stores = await db.getStores()

      // 过滤
      if (order_no) {
        orders = orders.filter(o => o.order_no.includes(order_no))
      }
      if (store_id) {
        orders = orders.filter(o => o.store_id == store_id)
      }
      if (pay_status) {
        orders = orders.filter(o => o.status === pay_status)
      }
      if (split_status) {
        orders = orders.filter(o => o.split_status === split_status)
      }

      // 关联信息
      orders = orders.map(o => {
        const m = merchants.find(m => String(m.id) === String(o.merchant_id))
        const s = stores.find(s => s.id === o.store_id)
        return {
          ...o,
          merchant_name: m?.register_name || '',
          store_name: s?.store_name || ''
        }
      })

      const total = orders.length

      // 分页
      const offset = (parseInt(page) - 1) * parseInt(page_size)
      const list = orders.slice(offset, offset + parseInt(page_size))

      res.json({ code: 0, data: { list, total, page: parseInt(page), page_size: parseInt(page_size) } })
    } catch (e) {
      console.error('[支付订单列表] error:', e)
      res.json({ code: 1, message: e.message })
    }
  })

  // GET /api/orders/withdraw - 提现订单列表
  router.get('/withdraw', async (req, res) => {
    const { status, page = 1, page_size = 20 } = req.query
    try {
      const filters = { type: 'WITHDRAW' }
      if (status) filters.status = status
      
      let transactions = await db.getTransactions(filters)
      
      let merchants = await getMerchants()

      // 关联商户信息
      transactions = transactions.map(t => {
        const m = merchants.find(m => String(m.id) === String(t.merchant_id))
        return {
          ...t,
          merchant_name: m?.register_name || ''
        }
      })

      const total = transactions.length

      // 分页
      const offset = (parseInt(page) - 1) * parseInt(page_size)
      const list = transactions.slice(offset, offset + parseInt(page_size))

      res.json({ code: 0, data: { list, total, page: parseInt(page), page_size: parseInt(page_size) } })
    } catch (e) {
      console.error('[提现订单列表] error:', e)
      res.json({ code: 1, message: e.message })
    }
  })

  // GET /api/orders/:orderNo - 订单详情
  router.get('/:orderNo', async (req, res) => {
    const { orderNo } = req.params
    try {
      const orders = await db.getOrders()
      const order = orders.find(o => o.order_no === orderNo)
      
      if (!order) {
        return res.json({ code: -1, msg: '订单不存在' })
      }

      // 查询支付流水
      const payment_flows = await db.getPaymentFlowsByOrderNo(orderNo)

      res.json({ code: 0, data: { ...order, payment_flows } })
    } catch (e) {
      console.error('[订单详情] error:', e)
      res.json({ code: 1, message: e.message })
    }
  })


  // POST /api/orders/:orderNo/split — 手动触发分账
  router.post('/:orderNo/split', async (req, res) => {
    try {
      const order = await db.getOrderByOrderNo(req.params.orderNo);
      if (!order) {
        return res.status(404).json({ code: 404, message: '订单不存在' });
      }
      if (order.split_status === 'SUCCESS') {
        return res.json({ code: 0, data: { message: '该订单已分账', split_status: 'SUCCESS' } });
      }

      // 获取旅行团分账成员
      const members = await db.getTourMembers ? await db.getTourMembers(order.tour_group_id) : [];

      if (!members || members.length === 0) {
        return res.json({ code: 0, data: { message: '该旅行团无分账成员，无需分账' } });
      }

      // 获取商户账户
      const merchants = await getMerchants();
      const merchant = merchants.find(m => m.id === order.merchant_id);
      const account_no = merchant?.qzt_account_no;

      if (!account_no) {
        return res.status(400).json({ code: 400, message: '商户无钱账通账户' });
      }

      // 按成员比例分账
      const splitAmount = order.amount || 0;
      const splitList = members.map(m => {
        const targetMerchant = merchants.find(m2 => m2.id === m.merchant_id);
        return {
          account_no: targetMerchant?.qzt_account_no || '',
          amount: String(Math.round(splitAmount * (m.split_ratio || 0) / 100)),
          remark: '自动分账'
        };
      }).filter(m => m.account_no && parseInt(m.amount) > 0);

      if (splitList.length === 0) {
        return res.json({ code: 0, data: { message: '无可分账成员' } });
      }

      const { callQzt, parseQztResult, generateTransNo } = require('../qzt');

      const splitNo = generateTransNo();
      const result = await callQzt('trans.trade.fund.split', {
        out_request_no: splitNo,
        account_no: account_no,
        split_type: '01',
        split_amount: String(splitAmount),
        split_list: splitList,
        back_url: (process.env.QZT_CALLBACK_URL || 'http://localhost:3000') + '/api/split/callback'
      });

      const parsed = parseQztResult(result.result);
      const status = parsed.status === 'SUCCESS' ? 'SUCCESS' : 'PENDING';

      await db.updateOrderSplitStatus(order.order_no, status);

      res.json({
        code: 0,
        data: { split_no: splitNo, split_status: status, message: status === 'SUCCESS' ? '分账成功' : '分账已提交' }
      });
    } catch (e) {
      console.error('[orders/split] Error:', e);
      res.status(500).json({ code: 500, message: '分账失败', error: e.message });
    }
  });

  return router
}