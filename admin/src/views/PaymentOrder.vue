<template>
  <div class="page">
    <div class="page-title">📋 付款订单</div>
    <div style="display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap">
      <el-button type="primary" @click="showCreateDialog = true">+ 创建付款订单</el-button>
    </div>
    <div class="card">
      <div class="card-header">付款订单列表</div>
      <div class="card-body">
        <el-table :data="orders" stripe>
          <el-table-column prop="orderNo" label="订单号" width="200"/>
          <el-table-column prop="payerName" label="付款方" width="150"/>
          <el-table-column prop="receiverName" label="收款方" width="150"/>
          <el-table-column prop="totalAmount" label="订单金额" width="120">
            <template #default="{row}"><span class="money">¥{{ row.totalAmount.toLocaleString() }}</span></template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{row}"><el-tag size="small" :type="row.status==='success'?'success':'warning'">{{ row.status }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="170"/>
        </el-table>
      </div>
    </div>

    <!-- 创建付款弹窗 -->
    <el-dialog v-model="showCreateDialog" title="创建付款订单" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="付款账户" required>
          <el-select v-model="form.payerAccountNo" placeholder="请选择付款账户" style="width:100%">
            <el-option label="主账户 (LAK2026030001)" value="LAK2026030001"/>
            <el-option label="拉卡拉账户" value="lakala"/>
          </el-select>
        </el-form-item>
        <el-form-item label="收款方" required>
          <el-select v-model="form.receiverAccountNo" placeholder="请选择收款方" style="width:100%">
            <el-option label="李四 (导游)" value="LAK2026030003"/>
            <el-option label="王五 (司机)" value="LAK2026030004"/>
            <el-option label="顺风旅行社" value="LAK2026030002"/>
          </el-select>
        </el-form-item>
        <el-form-item label="分账金额" required>
          <el-input v-model.number="form.amount" placeholder="请输入分账金额" style="width:100%">
            <template #prepend>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" placeholder="选填" style="width:100%"/>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog=false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确认提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'

const orders = ref([
  { orderNo: 'ORD20260326001', payerName: '顺风旅行社', receiverName: '李四 (导游)', totalAmount: 5000, status: 'success', createTime: '2026-03-26 10:30:00' },
  { orderNo: 'ORD20260326002', payerName: '顺风旅行社', receiverName: '李四 (导游)', totalAmount: 8000, status: 'success', createTime: '2026-03-25 15:20:00' },
])
const showCreateDialog = ref(false)
const submitting = ref(false)
const form = reactive({ payerAccountNo: '', receiverAccountNo: '', amount: null, remark: '' })

const handleSubmit = async () => {
  if (!form.payerAccountNo || !form.receiverAccountNo || !form.amount) { ElMessage.warning('请填写完整信息'); return }
  submitting.value = true
  await new Promise(r => setTimeout(r, 1500))
  orders.value.unshift({ orderNo: 'ORD' + Date.now(), payerName: form.payerAccountNo, receiverName: form.receiverAccountNo, totalAmount: form.amount, status: 'success', createTime: new Date().toLocaleString() })
  showCreateDialog.value = false; submitting.value = false; form.amount = null; form.remark = ''
  ElMessage.success('付款订单提交成功')
}
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600; }
.card-body { padding: 20px; }
</style>
