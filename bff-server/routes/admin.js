// bff-server/routes/admin.js
const express = require('express');
const router = express.Router();

module.exports = function createAdminRouter(deps) {
  const { db } = deps;

  // ========== 租户管理 ==========

  // 获取租户列表
  router.get('/tenants', async (req, res) => {
    const { status, split_role, keyword } = req.query;
    const tenants = await db.getTenants({ status, split_role, keyword });
    res.json({ code: 0, data: tenants });
  });

  // 获取可选租户列表（必须在 /tenants/:id 之前注册，否则会被 :id 截获）
  router.get('/tenants/options', async (req, res) => {
    const options = await db.getTenantOptions();
    res.json({ code: 0, data: options });
  });

  // 获取租户详情
  router.get('/tenants/:id', async (req, res) => {
    const tenant = await db.getTenantById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ code: 404, message: '租户不存在' });
    }
    // 获取功能权限
    const features = await db.getMerchantFeatures(req.params.id);
    res.json({ code: 0, data: { ...tenant, features } });
  });

  // 更新租户状态
  router.put('/tenants/:id/status', async (req, res) => {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ code: 400, message: '缺少 status 参数' });
    }
    const tenant = await db.updateTenantStatus(req.params.id, status);
    res.json({ code: 0, data: tenant });
  });

  // 更新租户功能权限
  router.put('/tenants/:id/features', async (req, res) => {
    const features = await db.saveMerchantFeatures({
      merchant_id: req.params.id,
      ...req.body
    });
    res.json({ code: 0, data: features });
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