/**
 * split-engine.js — 分账引擎路由
 */
const express = require('express');

module.exports = function (deps) {
  const router = express.Router();
  const { db } = deps;

  // ========== 场景管理 ==========

  // GET /scenes — 场景列表（支持分页）
  router.get('/scenes', async (req, res) => {
    try {
      const { page = 1, pageSize = 20 } = req.query;
      const size = Math.min(parseInt(pageSize) || 20, 100);
      const offset = (parseInt(page) - 1) * size;
      const tenant_id = req.auth?.tenant_id;
      const all = await db.getSplitEngineScenes(tenant_id);
      const total = all.length;
      const scenes = all.slice(offset, offset + size);
      res.json({ code: 0, data: { list: scenes, total, page: parseInt(page), pageSize: size } });
    } catch (e) {
      console.error('[split-engine] get scenes error:', e.message);
      res.status(500).json({ code: 500, message: '获取场景列表失败', error: e.message });
    }
  });

  // POST /scenes — 创建场景
  router.post('/scenes', async (req, res) => {
    try {
      const { name, code, description } = req.body;
      if (!name || !code) {
        return res.json({ code: 400, message: '场景名称和编码不能为空' });
      }
      const tenant_id = req.auth?.tenant_id;
      const existing = await db.getSplitEngineSceneByCode(tenant_id, code);
      if (existing) {
        return res.json({ code: 400, message: `场景编码 ${code} 已存在` });
      }
      const scene = await db.saveSplitEngineScene({
        tenant_id, name, code, description
      });
      res.json({ code: 0, data: scene, message: '场景创建成功' });
    } catch (e) {
      console.error('[split-engine] create scene error:', e.message);
      res.status(500).json({ code: 500, message: '创建场景失败', error: e.message });
    }
  });

  // PUT /scenes/:id — 更新场景（软删除也通过此端点：status='DELETED'）
  router.put('/scenes/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await db.getSplitEngineSceneById(id);
      if (!existing) return res.json({ code: 404, message: '场景不存在' });
      if (existing.tenant_id !== req.auth?.tenant_id) {
        return res.status(403).json({ code: 403, message: '无权操作此场景' });
      }
      const updates = {};
      ['name', 'code', 'description', 'status'].forEach(f => {
        if (req.body[f] !== undefined) updates[f] = req.body[f];
      });
      const updated = await db.updateSplitEngineScene(id, updates);
      res.json({ code: 0, data: updated, message: '场景更新成功' });
    } catch (e) {
      console.error('[split-engine] update scene error:', e.message);
      res.status(500).json({ code: 500, message: '更新场景失败', error: e.message });
    }
  });


  // ========== 参与方管理 ==========

  router.get('/parties', async (req, res) => {
    try {
      const { page = 1, pageSize = 20 } = req.query;
      const size = Math.min(parseInt(pageSize) || 20, 100);
      const offset = (parseInt(page) - 1) * size;
      const tenant_id = req.auth?.tenant_id;
      const all = await db.getSplitEngineParties(tenant_id);
      const total = all.length;
      const parties = all.slice(offset, offset + size);
      res.json({ code: 0, data: { list: parties, total, page: parseInt(page), pageSize: size } });
    } catch (e) {
      console.error('[split-engine] get parties error:', e.message);
      res.status(500).json({ code: 500, message: '获取参与方列表失败', error: e.message });
    }
  });

  router.post('/parties', async (req, res) => {
    try {
      const { name, role, merchant_id, account_no, settle_cycle } = req.body;
      if (!name) return res.json({ code: 400, message: '参与方名称不能为空' });
      const tenant_id = req.auth?.tenant_id;
      const party = await db.saveSplitEngineParty({
        tenant_id, name, role, merchant_id, account_no, settle_cycle
      });
      res.json({ code: 0, data: party, message: '参与方创建成功' });
    } catch (e) {
      console.error('[split-engine] create party error:', e.message);
      res.status(500).json({ code: 500, message: '创建参与方失败', error: e.message });
    }
  });

  router.put('/parties/:id', async (req, res) => {
    try {
      const existing = await db.getSplitEnginePartyById(req.params.id);
      if (!existing) return res.json({ code: 404, message: '参与方不存在' });
      if (existing.tenant_id !== req.auth?.tenant_id) {
        return res.status(403).json({ code: 403, message: '无权操作此参与方' });
      }
      const updates = {};
      ['name', 'role', 'merchant_id', 'account_no', 'settle_cycle', 'settle_trigger_value', 'status'].forEach(f => {
        if (req.body[f] !== undefined) updates[f] = req.body[f];
      });
      const updated = await db.updateSplitEngineParty(req.params.id, updates);
      res.json({ code: 0, data: updated, message: '参与方更新成功' });
    } catch (e) {
      console.error('[split-engine] update party error:', e.message);
      res.status(500).json({ code: 500, message: '更新参与方失败', error: e.message });
    }
  });

  router.delete('/parties/:id', async (req, res) => {
    try {
      const existing = await db.getSplitEnginePartyById(req.params.id);
      if (!existing) return res.json({ code: 404, message: '参与方不存在' });
      if (existing.tenant_id !== req.auth?.tenant_id) {
        return res.status(403).json({ code: 403, message: '无权操作此参与方' });
      }
      await db.deleteSplitEngineParty(req.params.id);
      res.json({ code: 0, message: '参与方已删除' });
    } catch (e) {
      console.error('[split-engine] delete party error:', e.message);
      res.status(500).json({ code: 500, message: '删除参与方失败', error: e.message });
    }
  });

  // 场景下的可用参与方（前端规则分配用）
  router.get('/scenes/:id/parties', async (req, res) => {
    try {
      const tenant_id = req.auth?.tenant_id;
      const sceneParties = await db.getSplitEnginePartiesByScene(req.params.id, tenant_id);
      const allParties = await db.getSplitEngineParties(tenant_id);
      res.json({ code: 0, data: { scene_parties: sceneParties, all_parties: allParties } });
    } catch (e) {
      console.error('[split-engine] get scene parties error:', e.message);
      res.status(500).json({ code: 500, message: '获取场景参与方失败', error: e.message });
    }
  });

  // ========== 规则组管理 ==========

  router.get('/rule-groups', async (req, res) => {
    try {
      const { scene_id, page = 1, pageSize = 20 } = req.query;
      const size = Math.min(parseInt(pageSize) || 20, 100);
      const offset = (parseInt(page) - 1) * size;
      const tenant_id = req.auth?.tenant_id;
      const all = await db.getSplitEngineRuleGroups(tenant_id, scene_id);
      const total = all.length;
      const groups = all.slice(offset, offset + size);
      res.json({ code: 0, data: { list: groups, total, page: parseInt(page), pageSize: size } });
    } catch (e) {
      console.error('[split-engine] get rule groups error:', e.message);
      res.status(500).json({ code: 500, message: '获取规则组列表失败', error: e.message });
    }
  });

  router.post('/rule-groups', async (req, res) => {
    try {
      const { scene_id, name, effective_from, effective_to, rules } = req.body;
      if (!scene_id || !name) return res.json({ code: 400, message: '场景ID和名称不能为空' });
      const scene = await db.getSplitEngineSceneById(scene_id);
      if (!scene || scene.tenant_id !== req.auth?.tenant_id) {
        return res.status(403).json({ code: 403, message: '无权操作此场景' });
      }
      const group = await db.saveSplitEngineRuleGroup({
        tenant_id: req.auth?.tenant_id, scene_id, name, effective_from, effective_to
      });
      if (rules && Array.isArray(rules)) {
        await db.saveSplitEngineRulesBatch(group.id, rules);
      }
      const result = await db.getSplitEngineRuleGroupById(group.id);
      res.json({ code: 0, data: result, message: '规则组创建成功' });
    } catch (e) {
      console.error('[split-engine] create rule group error:', e.message);
      res.status(500).json({ code: 500, message: '创建规则组失败', error: e.message });
    }
  });

  router.get('/rule-groups/:id', async (req, res) => {
    try {
      const group = await db.getSplitEngineRuleGroupById(req.params.id);
      if (!group) return res.json({ code: 404, message: '规则组不存在' });
      res.json({ code: 0, data: group });
    } catch (e) {
      console.error('[split-engine] get rule group error:', e.message);
      res.status(500).json({ code: 500, message: '获取规则组详情失败', error: e.message });
    }
  });

  router.put('/rule-groups/:id', async (req, res) => {
    try {
      const existing = await db.getSplitEngineRuleGroupById(req.params.id);
      if (!existing) return res.json({ code: 404, message: '规则组不存在' });
      if (existing.tenant_id !== req.auth?.tenant_id) {
        return res.status(403).json({ code: 403, message: '无权操作此规则组' });
      }
      const updates = {};
      ['name', 'effective_from', 'effective_to', 'status'].forEach(f => {
        if (req.body[f] !== undefined) updates[f] = req.body[f];
      });
      const updated = await db.updateSplitEngineRuleGroup(req.params.id, updates);
      res.json({ code: 0, data: updated, message: '规则组更新成功' });
    } catch (e) {
      console.error('[split-engine] update rule group error:', e.message);
      res.status(500).json({ code: 500, message: '更新规则组失败', error: e.message });
    }
  });

  // ========== 规则管理 ==========

  router.post('/rule-groups/:id/rules/batch', async (req, res) => {
    try {
      const { rules } = req.body;
      if (!rules || !Array.isArray(rules)) return res.json({ code: 400, message: 'rules 必须为数组' });
      const group = await db.getSplitEngineRuleGroupById(req.params.id);
      if (!group) return res.json({ code: 404, message: '规则组不存在' });
      if (group.tenant_id !== req.auth?.tenant_id) {
        return res.status(403).json({ code: 403, message: '无权操作此规则组' });
      }
      await db.saveSplitEngineRulesBatch(parseInt(req.params.id), rules);
      const updated = await db.getSplitEngineRuleGroupById(req.params.id);
      res.json({ code: 0, data: updated, message: '规则已保存' });
    } catch (e) {
      console.error('[split-engine] batch save rules error:', e.message);
      res.status(500).json({ code: 500, message: '保存规则失败', error: e.message });
    }
  });

  router.put('/rules/:id', async (req, res) => {
    try {
      const updates = {};
      ['rule_type', 'value', 'priority', 'settle_cycle', 'conditions', 'max_cap', 'min_guarantee', 'status'].forEach(f => {
        if (req.body[f] !== undefined) updates[f] = req.body[f];
      });
      const updated = await db.updateSplitEngineRule(req.params.id, updates);
      res.json({ code: 0, data: updated, message: '规则更新成功' });
    } catch (e) {
      console.error('[split-engine] update rule error:', e.message);
      res.status(500).json({ code: 500, message: '更新规则失败', error: e.message });
    }
  });

  router.delete('/rules/:id', async (req, res) => {
    try {
      await db.deleteSplitEngineRule(req.params.id);
      res.json({ code: 0, message: '规则已删除' });
    } catch (e) {
      console.error('[split-engine] delete rule error:', e.message);
      res.status(500).json({ code: 500, message: '删除规则失败', error: e.message });
    }
  });

  return router;
};