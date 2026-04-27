// bff-server/routes/auth.js
const express = require('express');
const router = express.Router();
const { issueToken, requireAuth, hashPassword } = require('../middleware/auth');

module.exports = function createAuthRouter(deps) {
  const { db } = deps;

  // 租户登录
  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ code: 400, message: '请输入账号和密码' });
      }

      const tenant = await db.getTenantByUsername(username);
      if (!tenant) {
        return res.status(401).json({ code: 401, message: '账号或密码错误' });
      }

      if (tenant.status !== 'ACTIVE') {
        return res.status(403).json({ code: 403, message: '账号已被禁用' });
      }

      const pwHash = hashPassword(password);
      if (pwHash !== tenant.password_hash) {
        return res.status(401).json({ code: 401, message: '账号或密码错误' });
      }

      const token = issueToken({
        tenant_id: tenant.id,
        tenant_name: tenant.tenant_name,
      });

      res.json({
        code: 0,
        data: {
          token,
          tenant: {
            id: tenant.id,
            tenant_name: tenant.tenant_name,
            qzt_account_no: tenant.qzt_account_no,
            contact_name: tenant.contact_name,
            contact_mobile: tenant.contact_mobile,
          }
        }
      });
    } catch (err) {
      console.error('[Auth] 登录失败:', err.message);
      res.status(500).json({ code: 500, message: '登录失败' });
    }
  });

  // 获取当前租户信息 + 汇总
  router.get('/me', requireAuth, async (req, res) => {
    try {
      const tenant_id = req.auth?.tenant_id;
      if (!tenant_id) {
        return res.status(401).json({ code: 401, message: '未登录' });
      }

      const tenant = await db.getTenantById(tenant_id);
      if (!tenant) {
        return res.status(404).json({ code: 404, message: '租户不存在' });
      }

      const merchantCount = await db.getTenantMerchantCount(tenant_id);

      // 获取该租户下所有门店的 QZT 账号（用于余额查询备选）
      const stores = await db.getMerchantsByTenant(tenant_id, { split_role: 'store' });

      res.json({
        code: 0,
        data: {
          tenant: {
            id: tenant.id,
            tenant_name: tenant.tenant_name,
            qzt_account_no: tenant.qzt_account_no,
            contact_name: tenant.contact_name,
            contact_mobile: tenant.contact_mobile,
          },
          summary: {
            merchant_count: merchantCount,
            store_accounts: stores.map(s => ({
              id: s.id,
              store_name: s.register_name,
              qzt_account_no: s.qzt_account_no
            })).filter(s => s.qzt_account_no)
          }
        }
      });
    } catch (err) {
      console.error('[Auth] 获取租户信息失败:', err.message);
      res.status(500).json({ code: 500, message: '获取租户信息失败' });
    }
  });

  return router;
};
