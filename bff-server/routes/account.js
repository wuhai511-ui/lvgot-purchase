/**
 * 账户路由 — 余额查询 / 绑定商户号 / 银行卡管理
 */
const express = require('express');
const { callQzt, parseQztResult, rsaEncrypt, toYuan, maskCardNo, getBankName } = require('../qzt');

module.exports = function ({ db, getAccountsByMerchantId, getBankCardsByMerchantId, saveBankCard, deleteBankCard }) {
  const router = express.Router();

  // ========== 账户余额查询 ==========
  router.get('/balance', async (req, res) => {
    try {
      const { merchant_id, account_no } = req.query;
      let qztAccountNo = account_no;

      // 如果未指定 account_no，尝试从租户 JWT 获取
      if (!qztAccountNo && req.auth?.tenant_id) {
        const tenant = await db.getTenantById(req.auth.tenant_id);
        if (tenant?.qzt_account_no) {
          qztAccountNo = tenant.qzt_account_no;
        }
      }

      // 如果仍未找到 account_no 且租户存在，返回备选门店账号列表
      if (!qztAccountNo && req.auth?.tenant_id) {
        const stores = await db.getMerchantsByTenant(req.auth.tenant_id, { split_role: 'store' });
        const storeAccounts = stores.filter(s => s.qzt_account_no).map(s => ({
          id: s.id,
          store_name: s.register_name,
          qzt_account_no: s.qzt_account_no
        }));
        if (storeAccounts.length > 0) {
          return res.json({
            code: 0,
            data: {
              need_select_account: true,
              store_accounts: storeAccounts
            }
          });
        }
      }

      // 从本地数据库获取账户信息
      let accounts = await getAccountsByMerchantId(merchant_id || 1);

      if (!accounts || accounts.length === 0) {
        // 调用钱账通余额查询接口
        const queryAccountNo = qztAccountNo || req.query.account_no;
        if (!queryAccountNo) {
          return res.json({
            code: 0,
            data: { balance: '0.00', frozen_amount: '0.00', available_amount: '0.00', no_account: true }
          });
        }

        const result = await callQzt('account.balance.query', {
          account_no: queryAccountNo
        });

        const parsed = parseQztResult(result.result);
        const qztBalance = parseInt(parsed.balance || 0);
        const qztFrozen = parseInt(parsed.frozen_amount || 0);

        res.json({
          code: 0,
          data: {
            balance: toYuan(qztBalance),
            frozen_amount: toYuan(qztFrozen),
            available_amount: toYuan(qztBalance - qztFrozen),
            qzt_account_no: queryAccountNo
          }
        });
      } else {
        const totalBalance = accounts.reduce((sum, a) => sum + (parseInt(a.balance) || 0), 0);
        const totalFrozen = accounts.reduce((sum, a) => sum + (parseInt(a.frozen_balance) || 0), 0);

        const accountsYuan = accounts.map(a => ({
          ...a,
          balance: toYuan(a.balance),
          frozen_balance: toYuan(a.frozen_balance)
        }));

        res.json({
          code: 0,
          data: {
            balance: toYuan(totalBalance),
            frozen_amount: toYuan(totalFrozen),
            available_amount: toYuan(totalBalance - totalFrozen),
            accounts: accountsYuan
          }
        });
      }
    } catch (error) {
      console.error('查询余额失败:', error.message);
      res.status(500).json({ code: 500, message: '查询余额失败', error: error.message });
    }
  });

  // ========== 绑定商户号 ==========
  router.post('/bind-merchant', async (req, res) => {
    try {
      const { merchant_id, merchant_no } = req.body;

      const result = await callQzt('merchant.terminal.bind', {
        account_no: merchant_no,
        merchant_no: merchant_no
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
      console.error('绑定商户号失败:', error.message);
      res.status(500).json({ code: 500, message: '绑定商户号失败', error: error.message });
    }
  });

  // ========== 账户明细（交易记录）==========
  router.get('/transactions', async (req, res) => {
    try {
      const { merchant_id, type, page = 1, page_size = 20 } = req.query;

      let transactions = await db.getTransactions({ merchant_id, type, limit: parseInt(page_size), offset: (parseInt(page) - 1) * parseInt(page_size) });

      // 租户隔离
      const tenant_id = req.auth?.tenant_id;
      if (tenant_id) {
        const tenantMerchants = await db.getMerchantsByTenant(tenant_id);
        const tenantMerchantIds = tenantMerchants.map(m => m.id);
        transactions = transactions.filter(t => tenantMerchantIds.includes(t.merchant_id));
      }

      // 获取商户信息用于关联
      const merchants = await db.getMerchants();

      transactions = transactions.map(t => {
        const merchant = merchants.find(m => String(m.id) === String(t.merchant_id));
        return {
          ...t,
          merchant_name: merchant?.register_name || '-',
          amount_yuan: (t.amount / 100).toFixed(2)
        };
      });

      res.json({ code: 0, data: { list: transactions, total: transactions.length } });
    } catch (error) {
      console.error('获取账户明细失败:', error.message);
      res.status(500).json({ code: 500, message: '获取账户明细失败' });
    }
  });

  // ========== 账户动账明细（流水）==========
  router.get('/flow', async (req, res) => {
    try {
      const { account_no, page = 1, page_size = 20, start_date, end_date } = req.query;

      if (!account_no) {
        return res.status(400).json({ code: 400, message: '缺少 account_no 参数' });
      }

      const params = {
        account_no,
        page: String(page),
        page_size: String(page_size)
      };
      if (start_date) params.start_date = start_date;
      if (end_date) params.end_date = end_date;

      const result = await callQzt('account.flow.query', params);
      const parsed = parseQztResult(result.result);

      res.json({
        code: 0,
        data: {
          list: parsed.list || [],
          total: parsed.total || 0,
          page: Number(page),
          page_size: Number(page_size)
        }
      });
    } catch (err) {
      console.error('[account/flow] Error:', err);
      res.status(500).json({ code: 500, message: '获取账户流水失败', error: err.message });
    }
  });

  return router;

};
