const express = require("express")
const { callQzt, parseQztResult, rsaEncrypt, generateTransNo } = require("../qzt")

module.exports = function ({ db, getTransactions, saveTransaction }) {
  const router = express.Router()

  // ========== 充值申请（新前端：展示收款账户信息弹窗） ==========
  router.post("/apply", async (req, res) => {
    try {
      const { merchant_id, amount, remark } = req.body
      const transactionNo = generateTransNo()
      const amountFen = Math.round(parseFloat(amount) * 100)

      // 从商户信息获取 account_no
      const merchants = await db.getMerchants()
      const merchant = merchants.find(m => String(m.id) === String(merchant_id))
      const account_no = merchant?.qzt_account_no || "7452174160891871232"

      const result = await callQzt("account.recharge.apply", {
        out_request_no: transactionNo,
        amount: String(amountFen),
        account_no
      })

      if (result.status === "FAIL") {
        return res.json({ code: 1, message: result.message || "充值申请失败" })
      }

      const parsed = parseQztResult(result.result)

      await saveTransaction({
        merchant_id: merchant_id || 1,
        out_request_no: transactionNo,
        transaction_type: "RECHARGE",
        amount: amountFen,
        status: "PENDING",
        remark: remark || "充值申请",
        qzt_response: parsed
      })

      res.json({
        code: 0,
        data: {
          recharge_order_no: parsed.recharge_order_no || transactionNo,
          payee_acc_no: parsed.payee_acc_no || account_no,
          payee_acc_name: parsed.payee_acc_name || "拉卡拉-备付金账户",
          payee_bank: parsed.payee_bank || "支付机构备付金集中存管户",
          payee_bank_no: parsed.payee_bank_no || "",
          payee_bank_name: parsed.payee_bank_name || "拉卡拉-备付金账户",
          payee_bank_area: parsed.payee_bank_area || "北京",
          amount: amount,
          status: parsed.status || "PENDING",
          message: "充值申请已提交"
        }
      })
    } catch (error) {
      console.error("充值申请失败:", error.message)
      res.status(500).json({ code: 500, message: "充值申请失败: " + error.message })
    }
  })

  // ========== 充值预下单（旧版兼容） ==========
  router.post("/pre-order", async (req, res) => {
    try {
      const { merchant_id, amount, remark } = req.body
      const transactionNo = generateTransNo()
      const amountFen = Math.round(parseFloat(amount) * 100)

      const merchants = await db.getMerchants()
      const merchant = merchants.find(m => String(m.id) === String(merchant_id))
      const account_no = merchant?.qzt_account_no || "7452174160891871232"

      const result = await callQzt("account.recharge.apply", {
        out_request_no: transactionNo,
        amount: String(amountFen),
        account_no
      })

      if (result.status === "FAIL") {
        return res.json({ code: 1, message: result.message || "充值申请失败" })
      }

      const parsed = parseQztResult(result.result)

      await saveTransaction({
        merchant_id: merchant_id || 1,
        out_request_no: transactionNo,
        transaction_type: "RECHARGE",
        amount: amountFen,
        status: "PENDING",
        remark: remark || "充值预下单",
        qzt_response: parsed
      })

      res.json({
        code: 0,
        data: {
          recharge_order_no: parsed.recharge_order_no || transactionNo,
          payee_acc_no: parsed.payee_acc_no || account_no,
          payee_acc_name: parsed.payee_acc_name || "拉卡拉-备付金账户",
          payee_bank: parsed.payee_bank || "支付机构备付金集中存管户",
          payee_bank_no: parsed.payee_bank_no || "",
          payee_bank_name: parsed.payee_bank_name || "拉卡拉-备付金账户",
          payee_bank_area: parsed.payee_bank_area || "北京",
          amount: amount,
          message: "预下单成功，请完成转账"
        }
      })
    } catch (error) {
      console.error("充值预下单失败:", error.message)
      res.status(500).json({ code: 500, message: "充值预下单失败: " + error.message })
    }
  })

  // ========== 充值确认 ==========
  router.post("/confirm", async (req, res) => {
    try {
      const { out_request_no, sms_code } = req.body
      const result = await callQzt("account.recharge.confirm", { out_request_no, sms_code })
      const parsed = parseQztResult(result.result)

      await saveTransaction({ out_request_no, status: parsed.status || "SUCCESS" })

      res.json({ code: 0, data: parsed })
    } catch (error) {
      console.error("充值确认失败:", error.message)
      res.status(500).json({ code: 500, message: "充值确认失败: " + error.message })
    }
  })

  // ========== 充值记录 ==========
  router.get("/records", async (req, res) => {
    try {
      const { merchant_id, page = 1, pageSize = 20 } = req.query
      const transactions = await getTransactions({
        merchant_id,
        type: "RECHARGE",
        limit: parseInt(pageSize),
        offset: (parseInt(page) - 1) * parseInt(pageSize)
      })
      res.json({ code: 0, data: transactions })
    } catch (error) {
      console.error("获取充值记录失败:", error.message)
      res.status(500).json({ code: 500, message: "获取充值记录失败" })
    }
  })

  return router
}
