const express = require('express');

module.exports = function ({ db, getMerchants }) {
  const router = express.Router();

  // ========== 门店列表 ==========
  router.get('/', async (req, res) => {
    try {
      const { store_id, store_name, page = 1, page_size = 20 } = req.query;
      let stores = await db.getStores();

      // 获取终端和旅行团关联数据
      const terminals = await db.getStoreTerminals();
      const tourGroupStores = await db.getTourGroupStores();

      // 过滤
      if (store_id) {
        stores = stores.filter(s => s.store_id.includes(store_id));
      }
      if (store_name) {
        stores = stores.filter(s => s.store_name.includes(store_name));
      }

      // 关联商户信息 + 终端数量 + 旅行团数量
      const merchants = await getMerchants();
      stores = stores.map(store => {
        const merchant = merchants.find(m => String(m.id) === String(store.merchant_id));
        const storeTerminals = terminals.filter(t => t.store_id === store.id);
        const storeTourGroups = tourGroupStores.filter(tgs => tgs.store_id === store.id);
        return {
          ...store,
          merchant_name: merchant?.register_name || '-',
          qzt_account_no: merchant?.qzt_account_no || '-',
          terminal_count: storeTerminals.length,
          tour_group_count: storeTourGroups.length
        };
      });

      // 分页
      const offset = (parseInt(page) - 1) * parseInt(page_size);
      const total = stores.length;
      stores = stores.slice(offset, offset + parseInt(page_size));

      res.json({ code: 0, data: { list: stores, total } });
    } catch (error) {
      console.error('获取门店列表失败:', error.message);
      res.status(500).json({ code: 500, message: '获取门店列表失败' });
    }
  });

  // ========== 门店详情 ==========
  router.get('/:id', async (req, res) => {
    try {
      const store = await db.getStoreById(req.params.id);
      if (!store) {
        return res.status(404).json({ code: 404, message: '门店不存在' });
      }

      // 获取关联商户
      const merchants = await getMerchants();
      const merchant = merchants.find(m => String(m.id) === String(store.merchant_id));

      // 获取终端列表
      const terminals = await db.getStoreTerminals(store.store_id);

      // 获取关联旅行团
      const allTourGroups = await db.getTourGroups();
      const allTgs = await db.getTourGroupStores();
      const tgIds = allTgs.filter(tgs => String(tgs.store_id) === String(store.store_id)).map(tgs => tgs.tour_group_id);
      const tourGroups = allTourGroups.filter(tg => tg.id && tgIds.includes(tg.id));

      res.json({
        code: 0,
        data: {
          ...store,
          merchant_name: merchant?.register_name || '-',
          qzt_account_no: merchant?.qzt_account_no || '-',
          terminals,
          tour_groups: tourGroups
        }
      });
    } catch (error) {
      console.error('获取门店详情失败:', error.message);
      res.status(500).json({ code: 500, message: '获取门店详情失败' });
    }
  });

  // ========== 新增门店 ==========
  router.post('/', async (req, res) => {
    try {
      const { store_name, account_no, merchant_id, tour_group_id } = req.body;

      if (!store_name) {
        return res.status(400).json({ code: 400, message: '请输入门店名称' });
      }

      if (!merchant_id) {
        return res.status(400).json({ code: 400, message: '请选择绑定账户' });
      }

      const storeId = await db.saveStore({
        store_name,
        account_no,
        merchant_id,
        tour_group_id
      });

            const store = await db.getStoreById(storeId);
      res.json({ code: 0, data: { id: store.id, store_id: store.store_id } });
    } catch (error) {
      console.error('创建门店失败:', error.message);
      res.status(500).json({ code: 500, message: '创建门店失败' });
    }
  });

  // ========== 删除门店 ==========
  router.delete('/:id', async (req, res) => {
    try {
      await db.deleteStore(req.params.id);
      res.json({ code: 0, message: '删除成功' });
    } catch (error) {
      console.error('删除门店失败:', error.message);
      res.status(500).json({ code: 500, message: '删除门店失败' });
    }
  });

  // ========== 新增终端 ==========
  router.post('/:id/terminals', async (req, res) => {
    try {
      const store = await db.getStoreById(req.params.id);
      if (!store) {
        return res.status(404).json({ code: 404, message: '门店不存在' });
      }

      const { merchant_no, terminal_no, merchant_name } = req.body;

      if (!merchant_no || !terminal_no) {
        return res.status(400).json({ code: 400, message: '请输入商户号和终端号' });
      }

      const id = await db.saveStoreTerminal({
        store_id: store.store_id,
        merchant_no,
        terminal_no,
        merchant_name
      });

      res.json({ code: 0, data: { id } });
    } catch (error) {
      console.error('添加终端失败:', error.message);
      res.status(500).json({ code: 500, message: '添加终端失败' });
    }
  });

  // ========== 删除终端 ==========
  router.delete('/terminals/:terminalId', async (req, res) => {
    try {
      await db.deleteStoreTerminal(req.params.terminalId);
      res.json({ code: 0, message: '删除成功' });
    } catch (error) {
      console.error('删除终端失败:', error.message);
      res.status(500).json({ code: 500, message: '删除终端失败' });
    }
  });

  // ========== 获取可绑定账户列表 ==========
  router.get('/available/accounts', async (req, res) => {
    try {
      const merchants = await getMerchants();
      const active = merchants.filter(m => m.pay_account_status === 'ACTIVE');
      res.json({
        code: 0,
        data: active.map(m => ({
          id: m.id,
          register_name: m.register_name,
          qzt_account_no: m.qzt_account_no,
          split_role: m.split_role
        }))
      });
    } catch (error) {
      console.error('获取账户列表失败:', error.message);
      res.status(500).json({ code: 500, message: '获取账户列表失败' });
    }
  });

  return router;
};
