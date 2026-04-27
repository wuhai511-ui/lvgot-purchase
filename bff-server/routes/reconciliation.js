/**
 * 对账路由 — 创建 / 查询 / 处理对账差异
 */
const express = require("express")

module.exports = function ({ db }) {
  const router = express.Router()

  // ========== 创建对账任务 ==========
  router.post("/tasks", async (req, res) => {
    try {
      const { taskType, dateRangeStart, dateRangeEnd, createdBy } = req.body
      if (!taskType || !dateRangeStart || !dateRangeEnd) {
        return res.status(400).json({ code: 400, message: "请提供对账类型和时间范围" })
      }

      const task_no = "REC" + Date.now()
      const task = await db.saveReconciliationTask({
        task_no,
        task_type: taskType,
        date_range_start: dateRangeStart,
        date_range_end: dateRangeEnd,
        created_by: createdBy
      })

      // 异步执行对账
      executeReconciliation(task_no, taskType, dateRangeStart, dateRangeEnd)

      res.json({ code: 0, data: task, message: "对账任务已创建" })
    } catch (error) {
      console.error("创建对账任务失败:", error.message)
      res.status(500).json({ code: 500, message: "创建对账任务失败" })
    }
  })

  // ========== 获取对账任务列表 ==========
  router.get("/tasks", async (req, res) => {
    try {
      const { status, task_type } = req.query
      const tasks = await db.getReconciliationTasks({ status, task_type })
      res.json({ code: 0, data: tasks })
    } catch (error) {
      console.error("获取对账任务失败:", error.message)
      res.status(500).json({ code: 500, message: "获取对账任务失败" })
    }
  })

  // ========== 获取对账任务详情 ==========
  router.get("/tasks/:taskNo", async (req, res) => {
    try {
      const { taskNo } = req.params
      const task = await db.getReconciliationTask(taskNo)
      if (!task) {
        return res.status(404).json({ code: 404, message: "对账任务不存在" })
      }

      const details = await db.getReconciliationDetails(taskNo)
      const differences = await db.getReconciliationDifferences(taskNo)

      res.json({ code: 0, data: { ...task, details, differences } })
    } catch (error) {
      console.error("获取对账任务详情失败:", error.message)
      res.status(500).json({ code: 500, message: "获取对账任务详情失败" })
    }
  })

  // ========== 处理对账差异 ==========
  router.put("/differences/:id", async (req, res) => {
    try {
      const { id } = req.params
      const { action, remark, resolved_by } = req.body

      if (action === "resolve") {
        await db.updateReconciliationDifference(id, {
          status: "resolved",
          resolved_by,
          resolved_at: new Date().toISOString()
        })
      } else if (action === "ignore") {
        await db.updateReconciliationDifference(id, {
          status: "ignored",
          resolved_by,
          resolved_at: new Date().toISOString()
        })
      }

      res.json({ code: 0, message: "差异已处理" })
    } catch (error) {
      console.error("处理对账差异失败:", error.message)
      res.status(500).json({ code: 500, message: "处理对账差异失败" })
    }
  })

  // ========== 异步执行对账 ==========
  async function executeReconciliation(task_no, task_type, start_date, end_date) {
    try {
      console.log("[对账] 开始执行任务:", task_no)
      await db.updateReconciliationTask(task_no, { status: "processing" })

      const transactions = await db.getTransactions({ start_date, end_date })
      const splitRecords = await db.getSplitRecords({ start_date, end_date })

      let matched = 0, unmatched = 0, difference_amount = 0

      for (const tx of transactions) {
        const relatedSplits = splitRecords.filter(s => s.out_request_no === tx.out_request_no)

        if (relatedSplits.length > 0) {
          matched++
          await db.saveReconciliationDetail({
            task_no, record_type: "transaction", record_id: tx.out_request_no,
            expected_amount: tx.amount, actual_amount: tx.amount,
            difference_amount: 0, status: "matched"
          })
        } else {
          unmatched++
          await db.saveReconciliationDetail({
            task_no, record_type: "transaction", record_id: tx.out_request_no,
            expected_amount: tx.amount, actual_amount: 0,
            difference_amount: tx.amount, status: "unmatched"
          })
          await db.saveReconciliationDifference({
            task_no, difference_type: "missing_split", severity: "high",
            description: "交易 " + tx.out_request_no + " 缺少分账记录",
            suggested_action: "请核实是否需要补充分账"
          })
          difference_amount += tx.amount
        }
      }

      await db.updateReconciliationTask(task_no, {
        status: "completed", total_records: transactions.length,
        matched_records: matched, unmatched_records: unmatched,
        difference_amount, completed_at: new Date().toISOString()
      })

      console.log("[对账] 任务完成:", task_no, "匹配:", matched, "未匹配:", unmatched)
    } catch (error) {
      console.error("[对账] 执行失败:", error.message)
      await db.updateReconciliationTask(task_no, { status: "failed" }).catch(() => {})
    }
  }

  return router
}
