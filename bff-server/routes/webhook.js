/**
 * 钱账通交易通知回调路由
 * 解析 remark 提取团号和商户号，匹配门店/旅行团，生成订单
 */
const express = require('express');

module.exports = function (deps) {
  const router = express.Router();
  const { db, getMerchants } = deps;
  const { callQzt, parseQztResult, generateTransNo } = require('../qzt');

  // POST /api/webhook/notify — 交易结果通知
  router.post('/notify', async (req, res) => {
    try {
      const notify = req.body;
      console.log('[Webhook] 收到交易通知:', JSON.stringify(notify).substring(0, 500));

      const remark = notify.remark || notify.remarks || '';
      const tourNo = extractValue(remark, '团号');
      const merchantNo = extractValue(remark, '商户号');

      if (!tourNo || !merchantNo) {
        console.log('[Webhook] remark 缺少团号或商户号:', remark);
        return res.send('SUCCESS');
      }

      const stores = await db.getStores();
      let matchedStore = null;
      for (const store of stores) {
        const terminals = await db.getStoreTerminals(store.store_id);
        if (terminals.find(t => t.merchant_no === merchantNo)) {
          matchedStore = store;
          break;
        }
      }

      if (!matchedStore) {
        console.log('[Webhook] 未匹配到门店, merchant_no:', merchantNo);
        return res.send('SUCCESS');
      }

      const allTourGroups = await db.getTourGroups();
      const tourGroup = allTourGroups.find(tg => tg.tour_no === tourNo);

      const merchants = await getMerchants();
      const merchant = merchants.find(m => String(m.id) === String(matchedStore.merchant_id));

      const orderNo = notify.out_trade_no || notify.order_no || 'TXN' + Date.now();
      const amount = parseInt(notify.total_amount || notify.amount || 0);

      await db.saveOrder({
        order_no: orderNo,
        order_type: 'PAY',
        store_id: matchedStore.store_id,
        tour_group_id: tourGroup?.id || null,
        merchant_id: matchedStore.merchant_id,
        amount: amount,
        pay_method: notify.pay_method || '',
        pay_status: 'SUCCESS',
        refund_status: 'NONE',
        split_status: 'PENDING',
        remark: remark,
        raw_notify: JSON.stringify(notify)
      });

      console.log('[Webhook] 订单已生成: ' + orderNo + ', 门店: ' + matchedStore.store_name + ', 团号: ' + tourNo);

      if (tourGroup && merchant?.qzt_account_no) {
        try {
          await autoSplit(orderNo, tourGroup, merchant, db, merchants);
        } catch (splitErr) {
          console.error('[Webhook] 自动分账失败:', splitErr.message);
        }
      }

      res.send('SUCCESS');
    } catch (error) {
      console.error('[Webhook] 处理通知失败:', error.message);
      res.send('SUCCESS');
    }
  });

  return router;
};

function extractValue(remark, key) {
  if (!remark) return '';
  return remark.split(',').map(p => p.trim()).filter(p => p.startsWith(key + ':')).map(p => p.substring(key.length + 1).trim())[0] || '';
}

async function autoSplit(orderNo, tourGroup, merchant, db, merchants) {
  const members = await db.getTourMembers ? await db.getTourMembers(tourGroup.id) : [];
  if (!members || members.length === 0) return;

  const order = await db.getOrderByOrderNo(orderNo);
  const splitAmount = order?.amount || 0;
  if (splitAmount <= 0) return;

  const splitList = members.map(m => {
    const target = merchants.find(m2 => m2.id === m.merchant_id);
    return {
      account_no: target?.qzt_account_no || '',
      amount: String(Math.round(splitAmount * (m.split_ratio || 0) / 100)),
      remark: '自动分账'
    };
  }).filter(m => m.account_no && parseInt(m.amount) > 0);

  if (splitList.length === 0) return;

  const splitNo = generateTransNo();
  const result = await callQzt('trans.trade.fund.split', {
    out_request_no: splitNo,
    account_no: merchant.qzt_account_no,
    split_type: '01',
    split_amount: String(splitAmount),
    split_list: splitList,
    back_url: (process.env.QZT_CALLBACK_URL || 'http://localhost:3000') + '/api/split/callback'
  });

  const parsed = parseQztResult(result.result);
  const status = parsed.status === 'SUCCESS' ? 'SUCCESS' : 'PENDING';
  await db.updateOrderSplitStatus(orderNo, status);
  console.log('[Webhook] 自动分账' + (status === 'SUCCESS' ? '成功' : '已提交') + ': ' + splitNo);
}
