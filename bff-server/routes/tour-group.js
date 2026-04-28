// bff-server/routes/tour-group.js
const express = require('express');

module.exports = function (deps) {
  const router = express.Router();
  const { db } = deps;

  // GET /api/tour-groups - 旅行社列表
  router.get('/', async (req, res) => {
    try {
      const { search, status, start_date, end_date, page = 1, page_size = 20 } = req.query;
      let groups = await db.getTourGroups();

      // 过滤
      if (search) {
        const kw = search.toLowerCase();
        groups = groups.filter(g =>
          g.tour_name?.toLowerCase().includes(kw) ||
          g.tour_no?.toLowerCase().includes(kw) ||
          g.route_name?.toLowerCase().includes(kw)
        );
      }
      if (status) {
        groups = groups.filter(g => g.status === status);
      }
      if (start_date) {
        groups = groups.filter(g => g.start_date >= start_date);
      }
      if (end_date) {
        groups = groups.filter(g => g.end_date <= end_date);
      }

      // 关联导游/司机/商店名称
      const merchants = await db.getMerchants();
      const stores = await db.getStores();
      groups = groups.map(g => {
        const guide = merchants.find(m => m.id === g.guide_id);
        const driver = merchants.find(m => m.id === g.driver_id);
        const shop = stores.find(s => s.id === g.shop_id);
        return {
          ...g,
          guide_name: guide?.register_name || '',
          driver_name: driver?.register_name || '',
          shop_name: shop?.store_name || '',
          total_amount_yuan: (g.total_amount / 100).toFixed(2)
        };
      });

      // 租户隔离（仅商户工作台）
      const tenant_id = req.auth?.tenant_id;
      if (tenant_id) {
        const tenantMerchants = await db.getMerchantsByTenant(tenant_id);
        const tenantMerchantIds = tenantMerchants.map(m => m.id);
        groups = groups.filter(g => tenantMerchantIds.includes(g.merchant_id));
      }

      // 分页
      const total = groups.length;
      const offset = (parseInt(page) - 1) * parseInt(page_size);
      const paged = groups.slice(offset, offset + parseInt(page_size));

      res.json({ code: 0, data: { list: paged, total } });
    } catch (error) {
      console.error('获取旅行社列表失败:', error.message);
      res.status(500).json({ code: 500, message: '获取旅行社列表失败' });
    }
  });

  // POST /api/tour-groups - 新增旅行社
  router.post('/', async (req, res) => {
    try {
      const tenant_id = req.auth?.tenant_id;
      const tour = await db.saveTourGroup({
        ...req.body,
        merchant_id: req.body.merchant_id || (tenant_id ? (await db.getMerchantsByTenant(tenant_id))[0]?.id : null)
      });
      res.json({ code: 0, data: tour });
    } catch (error) {
      console.error('新增旅行社失败:', error.message);
      res.status(500).json({ code: 500, message: '新增旅行社失败' });
    }
  });

  // PUT /api/tour-groups/:id - 更新旅行社
  router.put('/:id', async (req, res) => {
    try {
      const existing = await db.getTourGroupById(req.params.id);
      if (!existing) {
        return res.status(404).json({ code: 404, message: '旅行社不存在' });
      }
      const tour = await db.saveTourGroup({ ...existing, ...req.body });
      res.json({ code: 0, data: tour });
    } catch (error) {
      console.error('更新旅行社失败:', error.message);
      res.status(500).json({ code: 500, message: '更新旅行社失败' });
    }
  });

  // DELETE /api/tour-groups/:id - 删除旅行社
  router.delete('/:id', async (req, res) => {
    try {
      await db.deleteTourGroup(req.params.id);
      res.json({ code: 0, message: '删除成功' });
    } catch (error) {
      console.error('删除旅行社失败:', error.message);
      res.status(500).json({ code: 500, message: '删除旅行社失败' });
    }
  });

  return router;
};
