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

  // ========== 分账计算 ==========

  // 舍入策略：Math.round，尾差由最后一方吸收
  const toYuan = (fen) => (fen / 100).toFixed(2);

  function applyPercentageRules(rules, totalAmountFen) {
    let remaining = totalAmountFen;
    const results = [];
    const sorted = [...rules].sort((a, b) => (a.priority || 100) - (b.priority || 100));

    for (let i = 0; i < sorted.length; i++) {
      const rule = sorted[i];
      const isLast = i === sorted.length - 1;
      let deduction;

      if (rule.rule_type === 'percentage') {
        deduction = isLast ? remaining : Math.round(remaining * parseFloat(rule.value || '0'));
      } else if (rule.rule_type === 'fixed_amount') {
        deduction = Math.min(parseInt(rule.value) || 0, remaining);
      } else {
        deduction = 0; // tiered/conditional not supported in Phase 1
      }

      if (rule.max_cap && deduction > rule.max_cap) deduction = rule.max_cap;
      if (rule.min_guarantee && deduction < rule.min_guarantee) deduction = Math.min(rule.min_guarantee, remaining);

      results.push({
        party_id: rule.party_id,
        rule_id: rule.id,
        rule_type: rule.rule_type,
        expected_amount: deduction,
        calc_detail: {
          rule_id: rule.id,
          rule_type: rule.rule_type,
          base_amount: isLast ? (remaining - deduction + deduction) : remaining,
          rate: rule.rule_type === 'percentage' ? parseFloat(rule.value || '0') : null,
          formula: rule.rule_type === 'percentage'
            ? `${toYuan(remaining)} * ${(parseFloat(rule.value || '0') * 100).toFixed(2)}% = ${toYuan(deduction)}`
            : `fixed: ${rule.value}`
        }
      });

      remaining -= deduction;
    }
    return results;
  }

  router.post('/calculate', async (req, res) => {
    try {
      const { scene_code, payments, context } = req.body;
      if (!scene_code || !payments || !Array.isArray(payments) || payments.length === 0) {
        return res.json({ code: 400, message: '缺少必填参数: scene_code, payments' });
      }

      const tenant_id = req.auth?.tenant_id;
      const ruleGroup = await db.getActiveSplitEngineRuleGroup(scene_code, tenant_id);
      if (!ruleGroup) {
        return res.json({ code: 400, message: `未找到场景 "${scene_code}" 的生效规则组` });
      }

      const rules = await db.getSplitEngineRules(ruleGroup.id);
      if (!rules || rules.length === 0) {
        return res.json({ code: 400, message: '规则组内无规则' });
      }

      // Validate rule types — Phase 1 only supports percentage and fixed_amount
      const unsupported = rules.filter(r => !['percentage', 'fixed_amount'].includes(r.rule_type));
      if (unsupported.length > 0) {
        return res.json({ code: 400, message: `不支持的规则类型: ${unsupported.map(r => r.rule_type).join(', ')}。Phase 1 仅支持 percentage / fixed_amount` });
      }

      const allRecords = [];
      let totalInput = 0, totalSplit = 0;

      for (const payment of payments) {
        if (!payment.payment_id || typeof payment.amount !== 'number' || payment.amount <= 0) {
          return res.json({ code: 400, message: `支付数据不合法: ${JSON.stringify(payment)}` });
        }
        const splits = applyPercentageRules(rules, payment.amount);
        for (const s of splits) {
          const party = await db.getSplitEnginePartyById(s.party_id);
          allRecords.push({
            payment_id: payment.payment_id,
            party_id: s.party_id,
            party_name: party?.name || '未知',
            rule_id: s.rule_id,
            rule_type: s.rule_type,
            expected_amount: s.expected_amount,
            expected_amount_yuan: toYuan(s.expected_amount),
            calc_detail: s.calc_detail
          });
        }
        totalInput += payment.amount;
        totalSplit += splits.reduce((sum, s) => sum + s.expected_amount, 0);
      }

      res.json({
        code: 0,
        data: {
          rule_group: { id: ruleGroup.id, name: ruleGroup.name },
          records: allRecords,
          summary: {
            total_input: totalInput,
            total_input_yuan: toYuan(totalInput),
            total_split: totalSplit,
            total_split_yuan: toYuan(totalSplit),
            party_count: new Set(allRecords.map(r => r.party_id)).size,
            record_count: allRecords.length
          }
        }
      });
    } catch (e) {
      console.error('[split-engine] calculate error:', e.message);
      res.status(500).json({ code: 500, message: '分账计算失败', error: e.message });
    }
  });

  // ========== 分账记录查询 ==========

  router.get('/records', async (req, res) => {
    try {
      const { task_id, party_id, payment_id, status, page = 1, pageSize = 20 } = req.query;
      const size = Math.min(parseInt(pageSize) || 20, 100);
      const offset = (parseInt(page) - 1) * size;
      const filters = {};
      if (task_id) filters.task_id = task_id;
      if (party_id) filters.party_id = party_id;
      if (payment_id) filters.payment_id = payment_id;
      if (status) filters.status = status;
      const all = await db.getSplitEngineRecords(filters);
      const total = all.length;
      const records = all.slice(offset, offset + size);
      res.json({ code: 0, data: { list: records, total, page: parseInt(page), pageSize: size } });
    } catch (e) {
      console.error('[split-engine] get records error:', e.message);
      res.status(500).json({ code: 500, message: '获取分账记录失败', error: e.message });
    }
  });

  router.get('/records/:id', async (req, res) => {
    try {
      const record = await db.getSplitEngineRecordById(req.params.id);
      if (!record) return res.json({ code: 404, message: '记录不存在' });
      // Parse calc_detail for display
      if (record.calc_detail) {
        try { record.calc_detail = JSON.parse(record.calc_detail); } catch {}
      }
      res.json({ code: 0, data: record });
    } catch (e) {
      console.error('[split-engine] get record error:', e.message);
      res.status(500).json({ code: 500, message: '获取记录详情失败', error: e.message });
    }
  });

  return router;
};