// bff-server/routes/admin.js
const express = require('express');
const router = express.Router();

module.exports = function createAdminRouter(deps) {
  const { db } = deps;

  // ========== 租户管理（独立 tenants 表）==========

  // 获取租户列表
  router.get('/tenants', async (req, res) => {
    const { status, keyword } = req.query;
    const tenants = await db.getTenants({ status, keyword });
    // 为每个租户附加商户数量
    const result = await Promise.all(tenants.map(async t => {
      const count = await db.getTenantMerchantCount(t.id);
      return { ...t, merchant_count: count };
    }));
    res.json({ code: 0, data: result });
  });

  // 获取可选租户列表（必须在 /tenants/:id 之前）
  router.get('/tenants/options', async (req, res) => {
    const options = await db.getTenantOptions();
    res.json({ code: 0, data: options });
  });

  // 新增租户
  router.post('/tenants', async (req, res) => {
    const { tenant_name, username, password, qzt_account_no, contact_name, contact_mobile } = req.body;
    if (!tenant_name || !username || !password) {
      return res.status(400).json({ code: 400, message: '缺少必填字段: tenant_name, username, password' });
    }
    const password_hash = require('../middleware/auth').hashPassword(password);
    const tenant = await db.saveTenant({
      tenant_name, username, password_hash, qzt_account_no, contact_name, contact_mobile
    });
    res.json({ code: 0, data: tenant });
  });

  // 获取租户详情
  router.get('/tenants/:id', async (req, res) => {
    const tenant = await db.getTenantById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ code: 404, message: '租户不存在' });
    }
    const merchantCount = await db.getTenantMerchantCount(req.params.id);
    const merchants = await db.getTenantMerchants(req.params.id);
    res.json({ code: 0, data: { ...tenant, password_hash: undefined, merchant_count: merchantCount, merchants } });
  });

  // 重置租户密码（必须在 /tenants/:id 之前）
  router.put('/tenants/:id/reset-password', async (req, res) => {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ code: 400, message: '请输入新密码' });
    }
    const password_hash = require('../middleware/auth').hashPassword(password);
    const tenant = await db.saveTenant({ id: req.params.id, password_hash });
    res.json({ code: 0, data: tenant, message: '密码重置成功' });
  });

  // 更新租户
  router.put('/tenants/:id', async (req, res) => {
    const { tenant_name, username, qzt_account_no, contact_name, contact_mobile, status } = req.body;
    const updates = { id: req.params.id };
    if (tenant_name !== undefined) updates.tenant_name = tenant_name;
    if (username !== undefined) updates.username = username;
    if (qzt_account_no !== undefined) updates.qzt_account_no = qzt_account_no;
    if (contact_name !== undefined) updates.contact_name = contact_name;
    if (contact_mobile !== undefined) updates.contact_mobile = contact_mobile;
    if (status !== undefined) updates.status = status;
    // 密码单独处理
    if (req.body.password) {
      updates.password_hash = require('../middleware/auth').hashPassword(req.body.password);
    }
    const tenant = await db.saveTenant(updates);
    res.json({ code: 0, data: tenant });
  });

  // 删除租户（软删除）
  router.delete('/tenants/:id', async (req, res) => {
    await db.deleteTenant(req.params.id);
    res.json({ code: 0, message: '删除成功' });
  });

  // 获取租户下的商户列表
  router.get('/tenants/:id/merchants', async (req, res) => {
    const { split_role, status, keyword } = req.query;
    const merchants = await db.getMerchantsByTenant(req.params.id, { split_role, status, keyword });
    res.json({ code: 0, data: merchants });
  });

  // ========== 导游管理 ==========

  // 获取导游列表
  router.get('/guides', async (req, res) => {
    const { status, keyword } = req.query;
    const guides = await db.getGuides({ status, keyword });
    res.json({ code: 0, data: guides });
  });

  // 获取导游详情
  router.get('/guides/:id', async (req, res) => {
    // 导游存储在 merchants 表，通过 split_role='guide' 标识
    const guide = await db.getTenantById(req.params.id);
    if (!guide || guide.split_role !== 'guide') {
      return res.status(404).json({ code: 404, message: '导游不存在' });
    }
    const features = await db.getMerchantFeatures(req.params.id);
    res.json({ code: 0, data: { ...guide, features } });
  });

  // 审核导游（通过/驳回）
  router.put('/guides/:id/audit', async (req, res) => {
    const { status, reject_reason } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ code: 400, message: '无效的审核状态' });
    }
    const guide = await db.updateTenantStatus(req.params.id, status);
    if (status === 'REJECTED' && reject_reason) {
      await db.saveMerchant({
        ...guide,
        callback_message: reject_reason
      });
    }
    res.json({ code: 0, data: guide });
  });

  // ========== 门店管理（管理员视角）==========

  // 获取所有门店（不限制租户）
  router.get('/stores', async (req, res) => {
    const stores = await db.getStores();
    res.json({ code: 0, data: stores });
  });

  // 获取门店详情
  router.get('/stores/:store_id', async (req, res) => {
    const store = await db.getStoreByStoreId(req.params.store_id);
    if (!store) {
      return res.status(404).json({ code: 404, message: '门店不存在' });
    }
    const terminals = await db.getStoreTerminals(req.params.store_id);
    res.json({ code: 0, data: { ...store, terminals } });
  });

  // ========== 旅行社管理（管理员视角）==========

  // 获取所有旅行社/团队
  router.get('/tours', async (req, res) => {
    const { status } = req.query;
    const tours = await db.getTourGroups();
    res.json({ code: 0, data: tours });
  });

  // ========== 财务报表（管理员视角）==========

  // 获取交易流水（所有租户）
  router.get('/transactions', async (req, res) => {
    const { type, status, limit = 100 } = req.query;
    const transactions = await db.getTransactions({ type, status, limit: parseInt(limit) });
    res.json({ code: 0, data: transactions });
  });

  // 获取账户列表（所有租户）
  router.get('/accounts', async (req, res) => {
    const merchants = await db.getMerchants();
    const accountsMap = {};
    for (const m of merchants) {
      const accounts = await db.getAccountsByMerchantId(m.id);
      if (accounts.length > 0) {
        accountsMap[m.id] = { ...accounts[0], merchant_name: m.register_name };
      }
    }
    res.json({ code: 0, data: Object.values(accountsMap) });
  });

  // ========== AI 模型配置 ==========

  // 获取 AI 模型列表
  router.get('/ai-models', async (req, res) => {
    const { status, model_type, keyword } = req.query;
    const models = await db.getAIModels({ status, model_type, keyword });
    res.json({ code: 0, data: models });
  });

  // 获取 AI 模型详情（含明文 api_key）
  router.get('/ai-models/:id', async (req, res) => {
    const model = await db.getAIModelById(req.params.id);
    if (!model) {
      return res.status(404).json({ code: 404, message: 'AI 模型不存在' });
    }
    res.json({ code: 0, data: model });
  });

  // 新增 AI 模型
  router.post('/ai-models', async (req, res) => {
    const { model_id, name, api_endpoint, api_key, model_type } = req.body;
    if (!model_id || !name || !api_endpoint) {
      return res.status(400).json({ code: 400, message: '缺少必填字段: model_id, name, api_endpoint' });
    }
    const model = await db.saveAIModel({ model_id, name, api_endpoint, api_key, model_type });
    res.json({ code: 0, data: model });
  });

  // 更新 AI 模型
  router.put('/ai-models/:id', async (req, res) => {
    const model = await db.saveAIModel({ id: req.params.id, ...req.body });
    res.json({ code: 0, data: model });
  });

  // 删除 AI 模型
  router.delete('/ai-models/:id', async (req, res) => {
    await db.deleteAIModel(req.params.id);
    res.json({ code: 0, message: '删除成功' });
  });

  return router;
};