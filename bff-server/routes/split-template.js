const express = require('express')

module.exports = function (deps) {
  const router = express.Router()
  const { db } = deps

  // GET /api/split-templates - 获取模板列表
  router.get('/', async (req, res) => {
    try {
      const templates = await db.getSplitTemplates()
      res.json({ code: 0, data: templates })
    } catch (e) {
      console.error('[分账模板] error:', e)
      res.json({ code: 1, message: e.message })
    }
  })

  // POST /api/split-templates - 创建模板
  router.post('/', async (req, res) => {
    try {
      const { name, description, items } = req.body
      const id = await db.saveSplitTemplate({ name, description, items: JSON.stringify(items) })
      res.json({ code: 0, data: { template_id: id } })
    } catch (e) {
      console.error('[分账模板] 创建 error:', e)
      res.json({ code: 1, message: e.message })
    }
  })

  // PUT /api/split-templates/:id - 更新模板
  router.put('/:id', async (req, res) => {
    try {
      const { name, description, items } = req.body
      await db.saveSplitTemplate({ id: req.params.id, name, description, items: JSON.stringify(items) })
      res.json({ code: 0 })
    } catch (e) {
      console.error('[分账模板] 更新 error:', e)
      res.json({ code: 1, message: e.message })
    }
  })

  // DELETE /api/split-templates/:id - 删除模板
  router.delete('/:id', async (req, res) => {
    try {
      await db.deleteSplitTemplate(req.params.id)
      res.json({ code: 0 })
    } catch (e) {
      console.error('[分账模板] 删除 error:', e)
      res.json({ code: 1, message: e.message })
    }
  })

  return router
}