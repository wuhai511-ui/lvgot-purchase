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

  return router;
};